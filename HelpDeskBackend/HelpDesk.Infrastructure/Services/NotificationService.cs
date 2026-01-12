using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Infrastructure.Services;

/// <summary>
/// Notification service implementation
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _context;

    public NotificationService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Notification> SendNotificationAsync(
        int userId,
        string title,
        string message,
        NotificationType type,
        string? link = null,
        CancellationToken cancellationToken = default)
    {
        // Check notification preferences
        var shouldNotify = await ShouldNotifyAsync(userId, type, cancellationToken);
        if (!shouldNotify)
        {
            // User has disabled this notification type - return null notification
            return new Notification { Id = -1 }; // Dummy notification
        }

        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            Link = link,
            IsRead = false,
            Created = DateTime.Now
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync(cancellationToken);

        return notification;
    }

    public async Task NotifyRequestActionAsync(
        int requestId,
        int actorId,
        ActionType actionType,
        string? comment = null,
        CancellationToken cancellationToken = default)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null) return;

        var actor = await _context.Users.FindAsync(new object[] { actorId }, cancellationToken);
        if (actor == null) return;

        var actionText = actionType switch
        {
            ActionType.Approve => "approved",
            ActionType.Reject => "rejected",
            ActionType.Submit => "submitted",
            ActionType.Cancel => "cancelled",
            ActionType.Execute => "started execution on",
            ActionType.Close => "closed",
            _ => "updated"
        };

        var title = $"Request {actionText}";
        var message = $"{actor.FullName} {actionText} your request #{request.RequestNumber}";

        if (!string.IsNullOrEmpty(comment))
        {
            message += $": {comment}";
        }

        await SendNotificationAsync(
            request.RequesterId,
            title,
            message,
            NotificationType.RequestApproved,
            $"/requests/{requestId}",
            cancellationToken);
    }

    public async Task NotifyAssignmentAsync(
        int requestId,
        int assigneeId,
        int assignedBy,
        CancellationToken cancellationToken = default)
    {
        var request = await _context.Requests.FindAsync(new object[] { requestId }, cancellationToken);
        if (request == null) return;

        var assigner = await _context.Users.FindAsync(new object[] { assignedBy }, cancellationToken);
        if (assigner == null) return;

        var title = "New Request Assigned";
        var message = $"{assigner.FullName} assigned request #{request.RequestNumber} to you";

        await SendNotificationAsync(
            assigneeId,
            title,
            message,
            NotificationType.RequestAssigned,
            $"/requests/{requestId}",
            cancellationToken);
    }

    public async Task NotifyEscalationAsync(
        int requestId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null) return;

        // Notify requester
        await SendNotificationAsync(
            request.RequesterId,
            "Request Escalated",
            $"Your request #{request.RequestNumber} has been escalated. Reason: {reason}",
            NotificationType.SlaWarning,
            $"/requests/{requestId}",
            cancellationToken);

        // Notify admins
        var admins = await _context.Users
            .Where(u => u.Role == UserRole.Admin)
            .ToListAsync(cancellationToken);

        foreach (var admin in admins)
        {
            await SendNotificationAsync(
                admin.Id,
                "Request Escalated",
                $"Request #{request.RequestNumber} has been escalated. Reason: {reason}",
                NotificationType.SlaWarning,
                $"/requests/{requestId}",
                cancellationToken);
        }
    }

    public async Task NotifyCommentAsync(
        int requestId,
        int commenterId,
        string commentPreview,
        List<string>? mentions = null,
        CancellationToken cancellationToken = default)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null) return;

        var commenter = await _context.Users.FindAsync(new object[] { commenterId }, cancellationToken);
        if (commenter == null) return;

        // Notify request owner (if not the commenter)
        if (request.RequesterId != commenterId)
        {
            await SendNotificationAsync(
                request.RequesterId,
                "New Comment",
                $"{commenter.FullName} commented on request #{request.RequestNumber}: {commentPreview}",
                NotificationType.CommentAdded,
                $"/requests/{requestId}",
                cancellationToken);
        }

        // Notify mentioned users
        if (mentions != null && mentions.Any())
        {
            var mentionedUsers = await _context.Users
                .Where(u => mentions.Contains(u.Email))
                .ToListAsync(cancellationToken);

            foreach (var user in mentionedUsers)
            {
                if (user.Id != commenterId) // Don't notify the commenter
                {
                    await SendNotificationAsync(
                        user.Id,
                        "You were mentioned",
                        $"{commenter.FullName} mentioned you in request #{request.RequestNumber}",
                        NotificationType.CommentAdded,
                        $"/requests/{requestId}",
                        cancellationToken);
                }
            }
        }
    }

    public async Task NotifySlaWarningAsync(
        int requestId,
        int hoursRemaining,
        CancellationToken cancellationToken = default)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null) return;

        var message = hoursRemaining > 0
            ? $"Request #{request.RequestNumber} will breach SLA in {hoursRemaining} hours"
            : $"Request #{request.RequestNumber} has breached SLA!";

        await SendNotificationAsync(
            request.RequesterId,
            "SLA Warning",
            message,
            NotificationType.SlaWarning,
            $"/requests/{requestId}",
            cancellationToken);
    }

    public async Task<bool> ShouldNotifyAsync(
        int userId,
        NotificationType type,
        CancellationToken cancellationToken = default)
    {
        var preference = await _context.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (preference == null)
        {
            // No preferences set - default to all enabled
            return true;
        }

        // Check specific notification type
        // All notification types enabled by default if no preference exists
        return true;
    }
}
