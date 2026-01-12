using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HelpDesk.Infrastructure.Services;

/// <summary>
/// Workflow engine implementation
/// </summary>
public class WorkflowEngine : IWorkflowEngine
{
    private readonly IApplicationDbContext _context;
    private readonly IConditionEvaluator _conditionEvaluator;
    private readonly ISubWorkflowEngine _subWorkflowEngine;

    public WorkflowEngine(
        IApplicationDbContext context,
        IConditionEvaluator conditionEvaluator,
        ISubWorkflowEngine subWorkflowEngine)
    {
        _context = context;
        _conditionEvaluator = conditionEvaluator;
        _subWorkflowEngine = subWorkflowEngine;
    }

    public async Task<WorkflowExecutionResult> InitializeWorkflowAsync(int requestId, int serviceId, CancellationToken cancellationToken = default)
    {
        var result = new WorkflowExecutionResult();

        try
        {
            // Get request
            var request = await _context.Requests
                .Include(r => r.FormValue)
                .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

            if (request == null)
            {
                result.Errors.Add("Request not found");
                return result;
            }

            // Get workflow for service
            var workflow = await _context.Workflows
                .Include(w => w.Steps.OrderBy(s => s.StepOrder))
                .FirstOrDefaultAsync(w => w.ServiceId == serviceId && w.IsActive, cancellationToken);

            if (workflow == null)
            {
                // No workflow - mark as completed immediately
                result.Success = true;
                result.Message = "No workflow configured, request auto-completed";
                result.NewStatus = ServiceStatus.Completed;
                return result;
            }

            // Get first step
            var firstStep = workflow.Steps.FirstOrDefault();
            if (firstStep == null)
            {
                result.Errors.Add("Workflow has no steps");
                return result;
            }

            // Create active step
            var activeStep = new RequestActiveStep
            {
                RequestId = requestId,
                StepId = firstStep.Id,
                StepKey = $"step_{firstStep.Id}",
                Status = ActiveStepStatus.Active,
                StartedAt = DateTime.Now
            };

            _context.RequestActiveSteps.Add(activeStep);

            // Update request
            request.CurrentStepId = firstStep.Id;
            request.CurrentStepKey = activeStep.StepKey;
            request.Status = ServiceStatus.UnderReview;
            request.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync(cancellationToken);

            result.Success = true;
            result.Message = $"Workflow initialized at step: {firstStep.Name}";
            result.NewStatus = ServiceStatus.UnderReview;
            result.NextStepId = firstStep.Id;
            result.NextStepKey = activeStep.StepKey;
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Error initializing workflow: {ex.Message}");
        }

        return result;
    }

    public async Task<WorkflowExecutionResult> ExecuteStepAsync(int requestId, int stepId, int actorId, ActionType actionType, string? comment = null, CancellationToken cancellationToken = default)
    {
        var result = new WorkflowExecutionResult();

        try
        {
            // Get request with active steps
            var request = await _context.Requests
                .Include(r => r.FormValue)
                .Include(r => r.ActiveSteps)
                .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

            if (request == null)
            {
                result.Errors.Add("Request not found");
                return result;
            }

            // Get current step
            var currentStep = await _context.WorkflowSteps
                .Include(s => s.Workflow)
                .FirstOrDefaultAsync(s => s.Id == stepId, cancellationToken);

            if (currentStep == null)
            {
                result.Errors.Add("Step not found");
                return result;
            }

            // === HANDLE SUBWORKFLOW STEP TYPE ===
            if (currentStep.StepType == StepType.SubWorkflow)
            {
                // Parse subworkflow configuration from step condition (stored as JSON)
                if (!string.IsNullOrEmpty(currentStep.Condition))
                {
                    try
                    {
                        var subworkflowConfig = JsonSerializer.Deserialize<SubWorkflowConfig>(currentStep.Condition);

                        if (subworkflowConfig?.ChildServiceId != null)
                        {
                            // Get data to inherit to child workflow
                            var inheritedData = new Dictionary<string, object>();
                            if (!string.IsNullOrEmpty(request.FormValue?.FormData))
                            {
                                inheritedData = JsonSerializer.Deserialize<Dictionary<string, object>>(request.FormValue.FormData) ?? new();
                            }

                            // Trigger subworkflow
                            var subResult = await _subWorkflowEngine.TriggerSubWorkflowAsync(
                                requestId,
                                stepId,
                                subworkflowConfig.ChildServiceId.Value,
                                inheritedData,
                                cancellationToken);

                            if (subResult.Success)
                            {
                                result.Success = true;
                                result.Message = subResult.Message;
                                result.NewStatus = ServiceStatus.InProgress;

                                // Mark current step as completed since we started the subworkflow
                                var activeStep = request.ActiveSteps.FirstOrDefault(s => s.StepId == stepId && s.Status == ActiveStepStatus.Active);
                                if (activeStep != null)
                                {
                                    activeStep.Status = ActiveStepStatus.Completed;
                                    activeStep.CompletedAt = DateTime.Now;
                                }

                                // Move to wait or next step
                                var nextSteps = await DetermineNextStepsAsync(requestId, stepId, cancellationToken);
                                if (nextSteps.Any())
                                {
                                    var primaryNextStep = nextSteps.First();
                                    request.CurrentStepId = primaryNextStep.Id;
                                    request.CurrentStepKey = $"step_{primaryNextStep.Id}";
                                }

                                await _context.SaveChangesAsync(cancellationToken);
                                return result;
                            }
                            else
                            {
                                result.Errors.AddRange(subResult.Errors);
                                return result;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Failed to parse subworkflow configuration: {ex.Message}");
                        return result;
                    }
                }
            }

            // Handle action type
            if (actionType == ActionType.Approve)
            {
                // Mark current step as completed
                var activeStep = request.ActiveSteps.FirstOrDefault(s => s.StepId == stepId && s.Status == ActiveStepStatus.Active);
                if (activeStep != null)
                {
                    activeStep.Status = ActiveStepStatus.Completed;
                    activeStep.CompletedAt = DateTime.Now;
                }

                // Determine next steps (supports multiple for parallel workflows)
                var nextSteps = await DetermineNextStepsAsync(requestId, stepId, cancellationToken);

                if (nextSteps.Any())
                {
                    // === PARALLEL EXECUTION SUPPORT ===
                    // Create active steps for ALL returned next steps
                    var newActiveSteps = new List<RequestActiveStep>();

                    foreach (var nextStep in nextSteps)
                    {
                        var newActiveStep = new RequestActiveStep
                        {
                            RequestId = requestId,
                            StepId = nextStep.Id,
                            StepKey = $"step_{nextStep.Id}",
                            Status = ActiveStepStatus.Active,
                            StartedAt = DateTime.Now
                        };

                        _context.RequestActiveSteps.Add(newActiveStep);
                        newActiveSteps.Add(newActiveStep);
                    }

                    // Update request with primary next step (first one)
                    var primaryNextStep = nextSteps.First();
                    request.CurrentStepId = primaryNextStep.Id;
                    request.CurrentStepKey = $"step_{primaryNextStep.Id}";
                    request.Status = ServiceStatus.InProgress;
                    request.UpdatedAt = DateTime.Now;

                    result.Success = true;

                    if (nextSteps.Count > 1)
                    {
                        result.Message = $"Parallel execution: Advanced to {nextSteps.Count} steps";
                    }
                    else
                    {
                        result.Message = $"Advanced to step: {primaryNextStep.Name}";
                    }

                    result.NewStatus = ServiceStatus.InProgress;
                    result.NextStepId = primaryNextStep.Id;
                    result.NextStepKey = $"step_{primaryNextStep.Id}";
                }
                else
                {
                    // No more steps - complete request
                    request.Status = ServiceStatus.Completed;
                    request.CompletedAt = DateTime.Now;
                    request.UpdatedAt = DateTime.Now;

                    result.Success = true;
                    result.Message = "Workflow completed";
                    result.NewStatus = ServiceStatus.Completed;
                }
            }
            else if (actionType == ActionType.Reject)
            {
                // Mark step and request as rejected
                var activeStep = request.ActiveSteps.FirstOrDefault(s => s.StepId == stepId && s.Status == ActiveStepStatus.Active);
                if (activeStep != null)
                {
                    activeStep.Status = ActiveStepStatus.Completed;
                    activeStep.CompletedAt = DateTime.Now;
                }

                request.Status = ServiceStatus.Rejected;
                request.CompletedAt = DateTime.Now;
                request.UpdatedAt = DateTime.Now;

                result.Success = true;
                result.Message = "Request rejected";
                result.NewStatus = ServiceStatus.Rejected;
            }

            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Error executing step: {ex.Message}");
        }

        return result;
    }

    public async Task<List<WorkflowStep>> DetermineNextStepsAsync(int requestId, int currentStepId, CancellationToken cancellationToken = default)
    {
        var nextSteps = new List<WorkflowStep>();

        try
        {
            // Get current step
            var currentStep = await _context.WorkflowSteps
                .Include(s => s.Workflow)
                    .ThenInclude(w => w.Steps.OrderBy(st => st.StepOrder))
                .FirstOrDefaultAsync(s => s.Id == currentStepId, cancellationToken);

            if (currentStep == null)
            {
                return nextSteps;
            }

            // Get request data for condition evaluation
            var request = await _context.Requests
                .Include(r => r.FormValue)
                .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

            if (request == null)
            {
                return nextSteps;
            }

            var requestData = new Dictionary<string, object>();
            if (!string.IsNullOrEmpty(request.FormValue?.FormData))
            {
                try
                {
                    requestData = JsonSerializer.Deserialize<Dictionary<string, object>>(request.FormValue.FormData) ?? new();
                }
                catch
                {
                    // Handle deserialization error
                }
            }

            // === PARALLEL FORK SUPPORT ===
            // If current step is a ParallelFork, return ALL matching next steps
            if (currentStep.StepType == StepType.ParallelFork)
            {
                var potentialNextSteps = currentStep.Workflow.Steps
                    .Where(s => s.StepOrder > currentStep.StepOrder)
                    .OrderBy(s => s.StepOrder)
                    .ToList();

                foreach (var step in potentialNextSteps)
                {
                    // For fork, evaluate ALL conditions and add matching steps
                    if (!string.IsNullOrEmpty(step.Condition))
                    {
                        bool conditionMet = await _conditionEvaluator.EvaluateAsync(step.Condition, requestData, cancellationToken);
                        if (conditionMet)
                        {
                            nextSteps.Add(step);
                        }
                    }
                    else
                    {
                        // No condition - include this step
                        nextSteps.Add(step);
                    }

                    // Continue checking more steps for parallel execution
                    // Stop when we hit another fork, join, or end-type step
                    if (step.StepType == StepType.ParallelFork ||
                        step.StepType == StepType.ParallelJoin)
                    {
                        break;
                    }
                }

                return nextSteps;
            }

            // === PARALLEL JOIN SUPPORT ===
            // Check if next step is a join - if so, verify all predecessors are complete
            var immediateNextSteps = currentStep.Workflow.Steps
                .Where(s => s.StepOrder == currentStep.StepOrder + 1)
                .ToList();

            foreach (var nextStep in immediateNextSteps)
            {
                if (nextStep.StepType == StepType.ParallelJoin)
                {
                    // Check if all paths leading to this join are completed
                    bool allPathsComplete = await AreAllJoinPredecessorsComplete(requestId, nextStep.Id, cancellationToken);

                    if (allPathsComplete)
                    {
                        nextSteps.Add(nextStep);
                    }
                    // If not all complete, return empty list (wait for other branches)
                    return nextSteps;
                }
            }

            // === STANDARD LINEAR PROGRESSION ===
            // Get all steps after current step
            var potentialStandardSteps = currentStep.Workflow.Steps
                .Where(s => s.StepOrder > currentStep.StepOrder)
                .OrderBy(s => s.StepOrder)
                .ToList();

            foreach (var step in potentialStandardSteps)
            {
                // Evaluate condition if exists
                if (!string.IsNullOrEmpty(step.Condition))
                {
                    bool conditionMet = await _conditionEvaluator.EvaluateAsync(step.Condition, requestData, cancellationToken);
                    if (conditionMet)
                    {
                        nextSteps.Add(step);
                        break; // Take first matching step
                    }
                }
                else
                {
                    // No condition - take this step
                    nextSteps.Add(step);
                    break;
                }
            }
        }
        catch (Exception)
        {
            // Handle error
        }

        return nextSteps;
    }

    /// <summary>
    /// Check if all predecessor paths to a ParallelJoin node are completed
    /// </summary>
    private async Task<bool> AreAllJoinPredecessorsComplete(int requestId, int joinStepId, CancellationToken cancellationToken)
    {
        // Get the join step's workflow definition to analyze the graph
        var joinStep = await _context.WorkflowSteps
            .Include(s => s.Workflow)
                .ThenInclude(w => w.Steps)
            .FirstOrDefaultAsync(s => s.Id == joinStepId, cancellationToken);

        if (joinStep == null) return false;

        // Find all steps in the workflow that could lead to this join
        // (steps with order less than join step)
        var predecessorSteps = joinStep.Workflow.Steps
            .Where(s => s.StepOrder < joinStep.StepOrder)
            .Select(s => s.Id)
            .ToList();

        // Get all active steps for this request
        var activeSteps = await _context.RequestActiveSteps
            .Where(s => s.RequestId == requestId && predecessorSteps.Contains(s.StepId))
            .ToListAsync(cancellationToken);

        // Check if any predecessor is still active (not completed)
        var anyStillActive = activeSteps.Any(s => s.Status == ActiveStepStatus.Active);

        return !anyStillActive; // All must be completed
    }

    public async Task<List<RequestActiveStep>> GetActiveStepsAsync(int requestId, CancellationToken cancellationToken = default)
    {
        return await _context.RequestActiveSteps
            .Where(s => s.RequestId == requestId && s.Status == ActiveStepStatus.Active)
            .ToListAsync(cancellationToken);
    }

    public async Task<WorkflowValidationResult> ValidateWorkflowAsync(int workflowId, CancellationToken cancellationToken = default)
    {
        var result = new WorkflowValidationResult { IsValid = true };

        try
        {
            var workflow = await _context.Workflows
                .Include(w => w.Steps.OrderBy(s => s.StepOrder))
                .FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);

            if (workflow == null)
            {
                result.IsValid = false;
                result.Errors.Add("Workflow not found");
                return result;
            }

            // === ENHANCED VALIDATION ===

            // 1. Check if workflow has steps
            if (!workflow.Steps.Any())
            {
                result.IsValid = false;
                result.Errors.Add("Workflow must have at least one step");
            }

            // 2. Validate JSON definition structure
            if (!string.IsNullOrEmpty(workflow.Definition))
            {
                try
                {
                    var definition = JsonSerializer.Deserialize<WorkflowDefinitionJson>(workflow.Definition);

                    if (definition?.Nodes == null || definition.Nodes.Count == 0)
                    {
                        result.Warnings.Add("Workflow definition has no nodes");
                    }

                    if (definition?.Edges == null || definition.Edges.Count == 0)
                    {
                        result.Warnings.Add("Workflow definition has no edges");
                    }

                    // Validate start/end nodes in visual definition
                    if (definition?.Nodes != null)
                    {
                        var startNodes = definition.Nodes.Where(n => n.Type == "start").ToList();
                        var endNodes = definition.Nodes.Where(n => n.Type == "end").ToList();

                        if (startNodes.Count == 0)
                        {
                            result.IsValid = false;
                            result.Errors.Add("Workflow definition must have exactly one start node");
                        }
                        else if (startNodes.Count > 1)
                        {
                            result.IsValid = false;
                            result.Errors.Add($"Workflow has {startNodes.Count} start nodes, but must have exactly one");
                        }

                        if (endNodes.Count == 0)
                        {
                            result.Warnings.Add("Workflow definition should have at least one end node");
                        }
                    }
                }
                catch (Exception ex)
                {
                    result.Warnings.Add($"Failed to parse workflow definition JSON: {ex.Message}");
                }
            }

            // 3. Check step order continuity
            var expectedOrder = 1;
            foreach (var step in workflow.Steps.OrderBy(s => s.StepOrder))
            {
                if (step.StepOrder != expectedOrder)
                {
                    result.Warnings.Add($"Step order gap detected: expected {expectedOrder}, found {step.StepOrder}");
                }
                expectedOrder++;
            }

            // 4. Check for duplicate step orders
            var duplicateOrders = workflow.Steps
                .GroupBy(s => s.StepOrder)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key);

            foreach (var order in duplicateOrders)
            {
                result.IsValid = false;
                result.Errors.Add($"Duplicate step order: {order}");
            }

            // 5. Validate parallel fork/join pairs
            var forkSteps = workflow.Steps.Where(s => s.StepType == StepType.ParallelFork).ToList();
            var joinSteps = workflow.Steps.Where(s => s.StepType == StepType.ParallelJoin).ToList();

            if (forkSteps.Count != joinSteps.Count)
            {
                result.Warnings.Add($"Unbalanced parallel nodes: {forkSteps.Count} forks but {joinSteps.Count} joins");
            }

            // 6. Check for orphaned steps (steps with no way to reach them)
            // This requires analyzing the workflow graph - adding as warning for now
            if (workflow.Steps.Count > 2)
            {
                var minOrder = workflow.Steps.Min(s => s.StepOrder);
                var maxOrder = workflow.Steps.Max(s => s.StepOrder);

                if (maxOrder - minOrder + 1 != workflow.Steps.Count)
                {
                    result.Warnings.Add("Potential disconnected steps detected - verify workflow connectivity");
                }
            }
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.Errors.Add($"Error validating workflow: {ex.Message}");
        }

        return result;
    }

    // Helper class for JSON definition parsing
    private class WorkflowDefinitionJson
    {
        public List<NodeJson>? Nodes { get; set; }
        public List<EdgeJson>? Edges { get; set; }
    }

    private class NodeJson
    {
        public string? Id { get; set; }
        public string? Type { get; set; }
    }

    private class EdgeJson
    {
        public string? Id { get; set; }
        public string? Source { get; set; }
        public string? Target { get; set; }
    }

    // Helper class for SubWorkflow configuration
    private class SubWorkflowConfig
    {
        public int? ChildServiceId { get; set; }
        public Dictionary<string, string>? DataMapping { get; set; }
    }
}
