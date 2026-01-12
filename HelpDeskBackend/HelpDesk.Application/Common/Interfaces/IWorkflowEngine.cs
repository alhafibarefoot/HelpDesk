using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;

namespace HelpDesk.Application.Common.Interfaces;

/// <summary>
/// Service for executing and managing workflows
/// </summary>
public interface IWorkflowEngine
{
    /// <summary>
    /// Initialize a workflow for a new request
    /// </summary>
    Task<WorkflowExecutionResult> InitializeWorkflowAsync(int requestId, int serviceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute a step in the workflow
    /// </summary>
    Task<WorkflowExecutionResult> ExecuteStepAsync(int requestId, int stepId, int actorId, ActionType actionType, string? comment = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Determine the next steps based on current state and conditions
    /// </summary>
    Task<List<WorkflowStep>> DetermineNextStepsAsync(int requestId, int currentStepId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get active steps for a request
    /// </summary>
    Task<List<RequestActiveStep>> GetActiveStepsAsync(int requestId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate workflow structure
    /// </summary>
    Task<WorkflowValidationResult> ValidateWorkflowAsync(int workflowId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of workflow execution
/// </summary>
public class WorkflowExecutionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public ServiceStatus? NewStatus { get; set; }
    public int? NextStepId { get; set; }
    public string? NextStepKey { get; set; }
    public List<string> Errors { get; set; } = new();
}

/// <summary>
/// Result of workflow validation
/// </summary>
public class WorkflowValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}
