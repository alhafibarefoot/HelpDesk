using HelpDesk.Domain.Entities;

namespace HelpDesk.Application.Common.Interfaces;

/// <summary>
/// Service for handling request escalations
/// </summary>
public interface IEscalationService
{
    /// <summary>
    /// Check all requests for escalation conditions
    /// </summary>
    Task<EscalationCheckResult> CheckEscalationsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Escalate a specific request
    /// </summary>
    Task<bool> EscalateRequestAsync(int requestId, string reason, CancellationToken cancellationToken = default);

    /// <summary>
    /// Notify management about escalation
    /// </summary>
    Task NotifyManagementAsync(int requestId, string reason, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get escalation rules
    /// </summary>
    List<EscalationRule> GetEscalationRules();
}

/// <summary>
/// Result of escalation check
/// </summary>
public class EscalationCheckResult
{
    public int TotalChecked { get; set; }
    public int EscalatedCount { get; set; }
    public List<int> EscalatedRequestIds { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}

/// <summary>
/// Escalation rule configuration
/// </summary>
public class EscalationRule
{
    public string Name { get; set; } = string.Empty;
    public int HoursBeforeDue { get; set; } // Escalate X hours before SLA due
    public bool Enabled { get; set; } = true;
}
