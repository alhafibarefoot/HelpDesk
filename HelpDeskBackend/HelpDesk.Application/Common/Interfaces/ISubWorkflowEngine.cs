using HelpDesk.Domain.Entities;

namespace HelpDesk.Application.Common.Interfaces;

/// <summary>
/// Service for managing subworkflow execution
/// </summary>
public interface ISubWorkflowEngine
{
    /// <summary>
    /// Trigger a child workflow from a parent workflow step
    /// </summary>
    Task<SubWorkflowExecutionResult> TriggerSubWorkflowAsync(
        int parentRequestId,
        int parentStepId,
        int childServiceId,
        Dictionary<string, object> inheritedData,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if a subworkflow has completed
    /// </summary>
    Task<bool> IsSubWorkflowCompleteAsync(int childRequestId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get results from a completed subworkflow
    /// </summary>
    Task<SubWorkflowResult?> GetSubWorkflowResultAsync(int childRequestId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all active subworkflows for a parent request
    /// </summary>
    Task<List<SubWorkflowInfo>> GetActiveSubWorkflowsAsync(int parentRequestId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of subworkflow trigger
/// </summary>
public class SubWorkflowExecutionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? ChildRequestId { get; set; }
    public List<string> Errors { get; set; } = new();
}

/// <summary>
/// Result data from completed subworkflow
/// </summary>
public class SubWorkflowResult
{
    public int RequestId { get; set; }
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, object> OutputData { get; set; } = new();
    public DateTime CompletedAt { get; set; }
}

/// <summary>
/// Information about an active subworkflow
/// </summary>
public class SubWorkflowInfo
{
    public int ChildRequestId { get; set; }
    public int ChildServiceId { get; set; }
    public string ChildServiceName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
