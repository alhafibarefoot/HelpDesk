using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Infrastructure.Services;

/// <summary>
/// Escalation service implementation
/// </summary>
public class EscalationService : IEscalationService
{
    private readonly IApplicationDbContext _context;
    private readonly ISlaCalculator _slaCalculator;
    private readonly INotificationService _notificationService;
    private readonly List<EscalationRule> _rules;

    public EscalationService(
        IApplicationDbContext context,
        ISlaCalculator slaCalculator,
        INotificationService notificationService)
    {
        _context = context;
        _slaCalculator = slaCalculator;
        _notificationService = notificationService;

        // Initialize escalation rules
        _rules = new List<EscalationRule>
        {
            new EscalationRule
            {
                Name = "Near SLA Breach",
                HoursBeforeDue = 4, // Escalate 4 hours before SLA due
                Enabled = true
            },
            new EscalationRule
            {
                Name = "SLA Breached",
                HoursBeforeDue = 0, // Escalate immediately on breach
                Enabled = true
            }
        };
    }

    public async Task<EscalationCheckResult> CheckEscalationsAsync(CancellationToken cancellationToken = default)
    {
        var result = new EscalationCheckResult();

        try
        {
            // Get all active requests that are not completed
            var activeRequests = await _context.Requests
                .Where(r => r.Status != ServiceStatus.Completed
                         && r.Status != ServiceStatus.Rejected
                         && r.Status != ServiceStatus.Cancelled)
                .ToListAsync(cancellationToken);

            result.TotalChecked = activeRequests.Count;

            foreach (var request in activeRequests)
            {
                if (request.SlaDeAt == null) continue;

                var hoursRemaining = _slaCalculator.GetHoursRemaining(request.SlaDeAt);

                foreach (var rule in _rules.Where(r => r.Enabled))
                {
                    if (hoursRemaining <= rule.HoursBeforeDue)
                    {
                        var reason = rule.HoursBeforeDue == 0
                            ? "SLA has been breached"
                            : $"SLA will breach in {hoursRemaining:F1} hours";

                        var escalated = await EscalateRequestAsync(request.Id, reason, cancellationToken);

                        if (escalated)
                        {
                            result.EscalatedCount++;
                            result.EscalatedRequestIds.Add(request.Id);
                        }

                        break; // Only escalate once per request per check
                    }
                }
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Error checking escalations: {ex.Message}");
        }

        return result;
    }

    public async Task<bool> EscalateRequestAsync(int requestId, string reason, CancellationToken cancellationToken = default)
    {
        try
        {
            var request = await _context.Requests.FindAsync(new object[] { requestId }, cancellationToken);
            if (request == null) return false;

            // Update request priority to High if not already
            if (request.Priority != RequestPriority.High && request.Priority != RequestPriority.Urgent)
            {
                request.Priority = RequestPriority.High;
                request.UpdatedAt = DateTime.Now;
            }

            // Create escalation event
            var escalationEvent = new Domain.Entities.RequestEvent
            {
                RequestId = requestId,
                EventType = "escalated",
                PerformedBy = 0, // System
                PerformedAt = DateTime.Now,
                Payload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    reason,
                    escalated_at = DateTime.Now,
                    previous_priority = request.Priority.ToString()
                })
            };

            _context.RequestEvents.Add(escalationEvent);
            await _context.SaveChangesAsync(cancellationToken);

            // Notify about escalation
            await _notificationService.NotifyEscalationAsync(requestId, reason, cancellationToken);

            // Notify management
            await NotifyManagementAsync(requestId, reason, cancellationToken);

            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task NotifyManagementAsync(int requestId, string reason, CancellationToken cancellationToken = default)
    {
        var request = await _context.Requests
            .Include(r => r.Service)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null) return;

        // Notify service owners
        var serviceOwners = await _context.Users
            .Where(u => u.Role == UserRole.ServiceOwner || u.Role == UserRole.Admin)
            .ToListAsync(cancellationToken);

        foreach (var manager in serviceOwners)
        {
            await _notificationService.SendNotificationAsync(
                manager.Id,
                "Request Escalated - Action Required",
                $"Request #{request.RequestNumber} ({request.Service?.Name}) has been escalated. Reason: {reason}",
                NotificationType.SlaWarning,
                $"/requests/{requestId}",
                cancellationToken);
        }
    }

    public List<EscalationRule> GetEscalationRules()
    {
        return _rules;
    }
}
