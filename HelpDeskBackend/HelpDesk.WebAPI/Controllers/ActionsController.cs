using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Application.DTOs;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.WebAPI.Controllers;

/// <summary>
/// Manages request actions (approve, reject, etc.) and action history
/// </summary>
[Authorize]
[Route("api/requests/{requestId}/actions")]
public class ActionsController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ActionsController(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Get action history for a request
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<RequestActionDto>>> GetActions(int requestId)
    {
        var actions = await _context.RequestActions
            .Include(a => a.Actor)
            .Where(a => a.RequestId == requestId)
            .OrderBy(a => a.Created)
            .AsNoTracking()
            .ToListAsync();

        var actionDtos = actions.Select(a => new RequestActionDto
        {
            Id = a.Id,
            RequestId = a.RequestId,
            ActorId = a.ActorId,
            ActionType = a.ActionType.ToString(),
            FromStepId = a.FromStepId,
            ToStepId = a.ToStepId,
            FromStepKey = a.FromStepKey,
            ToStepKey = a.ToStepKey,
            Comment = a.Comment,
            CreatedAt = a.Created,
            Actor = a.Actor?.Adapt<UserDto>()
        }).ToList();

        return Ok(actionDtos);
    }

    /// <summary>
    /// Perform an action on a request (approve, reject, etc.)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<RequestActionDto>> PerformAction(
        int requestId,
        [FromBody] PerformActionDto dto)
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

        // Parse action type
        if (!Enum.TryParse<ActionType>(dto.ActionType, out var actionType))
        {
            return BadRequest("Invalid action type");
        }

        // Create action record
        var action = new RequestAction
        {
            RequestId = requestId,
            ActorId = userId,
            ActionType = actionType,
            FromStepId = request.CurrentStepId,
            FromStepKey = request.CurrentStepKey,
            ToStepId = dto.ToStepId,
            Comment = dto.Comment,
            Created = DateTime.Now
        };

        _context.RequestActions.Add(action);

        // Update request status based on action
        switch (actionType)
        {
            case ActionType.Submit:
                request.Status = ServiceStatus.UnderReview;
                request.UpdatedAt = DateTime.Now;
                break;

            case ActionType.Approve:
                // If there's a next step, move to it; otherwise mark as completed
                if (dto.ToStepId.HasValue)
                {
                    request.CurrentStepId = dto.ToStepId;
                    request.Status = ServiceStatus.InProgress;
                }
                else
                {
                    request.Status = ServiceStatus.Completed;
                    request.CompletedAt = DateTime.Now;
                }
                request.UpdatedAt = DateTime.Now;
                break;

            case ActionType.Reject:
                request.Status = ServiceStatus.Rejected;
                request.CompletedAt = DateTime.Now;
                request.UpdatedAt = DateTime.Now;
                break;

            case ActionType.Cancel:
                request.Status = ServiceStatus.Cancelled;
                request.CompletedAt = DateTime.Now;
                request.UpdatedAt = DateTime.Now;
                break;

            case ActionType.Execute:
                request.Status = ServiceStatus.InProgress;
                request.UpdatedAt = DateTime.Now;
                break;

            case ActionType.Close:
                request.Status = ServiceStatus.Completed;
                request.CompletedAt = DateTime.Now;
                request.UpdatedAt = DateTime.Now;
                break;
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        // Log event
        var actionEvent = new RequestEvent
        {
            RequestId = requestId,
            EventType = $"action_{actionType.ToString().ToLower()}",
            PerformedBy = userId,
            PerformedAt = DateTime.Now,
            Payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                action_id = action.Id,
                action_type = actionType.ToString(),
                comment = dto.Comment,
                new_status = request.Status.ToString()
            })
        };
        _context.RequestEvents.Add(actionEvent);
        await _context.SaveChangesAsync(CancellationToken.None);

        // Reload with actor info
        var createdAction = await _context.RequestActions
            .Include(a => a.Actor)
            .FirstOrDefaultAsync(a => a.Id == action.Id);

        var result = new RequestActionDto
        {
            Id = createdAction!.Id,
            RequestId = createdAction.RequestId,
            ActorId = createdAction.ActorId,
            ActionType = createdAction.ActionType.ToString(),
            FromStepId = createdAction.FromStepId,
            ToStepId = createdAction.ToStepId,
            FromStepKey = createdAction.FromStepKey,
            ToStepKey = createdAction.ToStepKey,
            Comment = createdAction.Comment,
            CreatedAt = createdAction.Created,
            Actor = createdAction.Actor?.Adapt<UserDto>()
        };

        return CreatedAtAction(nameof(GetActions), new { requestId }, result);
    }
}
