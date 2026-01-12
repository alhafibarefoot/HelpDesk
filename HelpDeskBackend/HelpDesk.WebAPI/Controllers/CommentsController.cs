using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Application.DTOs;
using HelpDesk.Domain.Entities;
using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.WebAPI.Controllers;

/// <summary>
/// Manages comments on requests
/// </summary>
[Authorize]
[Route("api/requests/{requestId}/comments")]
public class CommentsController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CommentsController(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Get all comments for a request
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<CommentDto>>> GetComments(int requestId)
    {
        var comments = await _context.RequestComments
            .Include(c => c.User)
            .Where(c => c.RequestId == requestId)
            .OrderBy(c => c.Created)
            .AsNoTracking()
            .ToListAsync();

        var commentDtos = comments.Select(c => new CommentDto
        {
            Id = c.Id,
            RequestId = c.RequestId,
            UserId = c.UserId,
            Content = c.Content,
            Mentions = c.Mentions != null ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(c.Mentions) : null,
            IsInternal = c.IsInternal,
            CreatedAt = c.Created,
            User = c.User?.Adapt<UserDto>()
        }).ToList();

        return Ok(commentDtos);
    }

    /// <summary>
    /// Add a comment to a request
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CommentDto>> AddComment(int requestId, [FromBody] CreateCommentDto dto)
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        // Verify request exists
        var request = await _context.Requests.FindAsync(requestId);
        if (request == null)
        {
            return NotFound("Request not found");
        }

        var comment = new RequestComment
        {
            RequestId = requestId,
            UserId = userId,
            Content = dto.Content,
            Mentions = dto.Mentions != null ? System.Text.Json.JsonSerializer.Serialize(dto.Mentions) : null,
            IsInternal = dto.IsInternal,
            Created = DateTime.Now
        };

        _context.RequestComments.Add(comment);
        await _context.SaveChangesAsync(CancellationToken.None);

        // Log event
        var commentEvent = new RequestEvent
        {
            RequestId = requestId,
            EventType = "comment_added",
            PerformedBy = userId,
            PerformedAt = DateTime.Now,
            Payload = System.Text.Json.JsonSerializer.Serialize(new { comment_id = comment.Id, content_preview = comment.Content.Substring(0, Math.Min(50, comment.Content.Length)) })
        };
        _context.RequestEvents.Add(commentEvent);
        await _context.SaveChangesAsync(CancellationToken.None);

        // Reload with user info
        var createdComment = await _context.RequestComments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == comment.Id);

        var result = new CommentDto
        {
            Id = createdComment!.Id,
            RequestId = createdComment.RequestId,
            UserId = createdComment.UserId,
            Content = createdComment.Content,
            Mentions = createdComment.Mentions != null ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(createdComment.Mentions) : null,
            IsInternal = createdComment.IsInternal,
            CreatedAt = createdComment.Created,
            User = createdComment.User?.Adapt<UserDto>()
        };

        return CreatedAtAction(nameof(GetComments), new { requestId }, result);
    }

    /// <summary>
    /// Delete a comment (author or admin only)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteComment(int requestId, int id)
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        var comment = await _context.RequestComments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id && c.RequestId == requestId);

        if (comment == null)
        {
            return NotFound();
        }

        // Only author or admin can delete
        var currentUser = await _context.Users.FindAsync(userId);
        if (comment.UserId != userId && currentUser?.Role != Domain.Enums.UserRole.Admin)
        {
            return Forbid();
        }

        _context.RequestComments.Remove(comment);
        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }
}
