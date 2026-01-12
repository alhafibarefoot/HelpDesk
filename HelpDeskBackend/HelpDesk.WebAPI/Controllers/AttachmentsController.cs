using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Application.DTOs;
using HelpDesk.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.WebAPI.Controllers;

/// <summary>
/// Manages file attachments on requests
/// </summary>
[Authorize]
[Route("api/requests/{requestId}/attachments")]
public class AttachmentsController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IWebHostEnvironment _environment;

    public AttachmentsController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IWebHostEnvironment environment)
    {
        _context = context;
        _currentUserService = currentUserService;
        _environment = environment;
    }

    /// <summary>
    /// Get all attachments for a request
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<AttachmentDto>>> GetAttachments(int requestId)
    {
        var attachments = await _context.RequestAttachments
            .Where(a => a.RequestId == requestId)
            .OrderBy(a => a.Created)
            .AsNoTracking()
            .ToListAsync();

        var attachmentDtos = attachments.Select(a => new AttachmentDto
        {
            Id = a.Id,
            RequestId = a.RequestId,
            FileName = a.FileName,
            FileUrl = a.FileUrl,
            UploadedBy = a.UploadedBy,
            CreatedAt = a.Created
        }).ToList();

        return Ok(attachmentDtos);
    }

    /// <summary>
    /// Upload a file attachment
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<AttachmentDto>> UploadAttachment(int requestId, IFormFile file)
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

        if (file == null || file.Length == 0)
        {
            return BadRequest("No file provided");
        }

        // Validate file size (10 MB limit)
        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest("File size exceeds 10 MB limit");
        }

        // Create uploads directory if it doesn't exist
        var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads", "requests", requestId.ToString());
        Directory.CreateDirectory(uploadsPath);

        // Generate unique file name
        var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
        var filePath = Path.Combine(uploadsPath, fileName);

        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Create attachment record
        var attachment = new RequestAttachment
        {
            RequestId = requestId,
            FileName = file.FileName,
            FileUrl = $"/uploads/requests/{requestId}/{fileName}",
            UploadedBy = userId,
            Created = DateTime.Now
        };

        _context.RequestAttachments.Add(attachment);
        await _context.SaveChangesAsync(CancellationToken.None);

        // Log event
        var attachmentEvent = new RequestEvent
        {
            RequestId = requestId,
            EventType = "attachment_added",
            PerformedBy = userId,
            PerformedAt = DateTime.Now,
            Payload = System.Text.Json.JsonSerializer.Serialize(new { attachment_id = attachment.Id, file_name = file.FileName })
        };
        _context.RequestEvents.Add(attachmentEvent);
        await _context.SaveChangesAsync(CancellationToken.None);

        var result = new AttachmentDto
        {
            Id = attachment.Id,
            RequestId = attachment.RequestId,
            FileName = attachment.FileName,
            FileUrl = attachment.FileUrl,
            UploadedBy = attachment.UploadedBy,
            CreatedAt = attachment.Created
        };

        return CreatedAtAction(nameof(GetAttachments), new { requestId }, result);
    }

    /// <summary>
    /// Delete an attachment
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteAttachment(int requestId, int id)
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        var attachment = await _context.RequestAttachments
            .FirstOrDefaultAsync(a => a.Id == id && a.RequestId == requestId);

        if (attachment == null)
        {
            return NotFound();
        }

        // Only uploader or admin can delete
        var currentUser = await _context.Users.FindAsync(userId);
        if (attachment.UploadedBy != userId && currentUser?.Role != Domain.Enums.UserRole.Admin)
        {
            return Forbid();
        }

        // Delete physical file
        try
        {
            var filePath = Path.Combine(_environment.ContentRootPath, attachment.FileUrl.TrimStart('/'));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }
        catch (Exception ex)
        {
            // Log error but continue with database deletion
            Console.WriteLine($"Error deleting file: {ex.Message}");
        }

        _context.RequestAttachments.Remove(attachment);
        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    /// <summary>
    /// Download an attachment
    /// </summary>
    [HttpGet("{id}/download")]
    public async Task<ActionResult> DownloadAttachment(int requestId, int id)
    {
        var attachment = await _context.RequestAttachments
            .FirstOrDefaultAsync(a => a.Id == id && a.RequestId == requestId);

        if (attachment == null)
        {
            return NotFound();
        }

        var filePath = Path.Combine(_environment.ContentRootPath, attachment.FileUrl.TrimStart('/'));

        if (!System.IO.File.Exists(filePath))
        {
            return NotFound("File not found on server");
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        var contentType = "application/octet-stream";

        return File(fileBytes, contentType, attachment.FileName);
    }
}
