using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;

namespace HelpDesk.Application.Common.Interfaces;

/// <summary>
/// Service for managing notifications
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Send a notification to a user
    /// </summary>
    Task<Notification> SendNotificationAsync(
        int userId,
        string title,
        string message,
        NotificationType type,
        string? link = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Notify about request action
    /// </summary>
    Task NotifyRequestActionAsync(
        int requestId,
        int actorId,
        ActionType actionType,
        string? comment = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Notify about request assignment
    /// </summary>
    Task NotifyAssignmentAsync(
        int requestId,
        int assigneeId,
        int assignedBy,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Notify about request escalation
    /// </summary>
    Task NotifyEscalationAsync(
        int requestId,
        string reason,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Notify about new comment
    /// </summary>
    Task NotifyCommentAsync(
        int requestId,
        int commenterId,
        string commentPreview,
        List<string>? mentions = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Notify about SLA warning
    /// </summary>
    Task NotifySlaWarningAsync(
        int requestId,
        int hoursRemaining,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if user has notification preferences
    /// </summary>
    Task<bool> ShouldNotifyAsync(
        int userId,
        NotificationType type,
        CancellationToken cancellationToken = default);
}
