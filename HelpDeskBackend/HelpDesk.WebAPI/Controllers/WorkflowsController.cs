using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Application.DTOs;
using HelpDesk.Domain.Entities;
using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HelpDesk.WebAPI.Controllers;

/// <summary>
/// Manages workflows for services
/// </summary>
[Authorize]
public class WorkflowsController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly ISubWorkflowEngine _subWorkflowEngine;

    public WorkflowsController(
        IApplicationDbContext context,
        IWorkflowEngine workflowEngine,
        ISubWorkflowEngine subWorkflowEngine)
    {
        _context = context;
        _workflowEngine = workflowEngine;
        _subWorkflowEngine = subWorkflowEngine;
    }

    /// <summary>
    /// Get all workflows
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult<List<WorkflowDto>>> GetWorkflows([FromQuery] bool? activeOnly = false)
    {
        var query = _context.Workflows
            .Include(w => w.Service)
            .AsNoTracking();

        if (activeOnly == true)
        {
            query = query.Where(w => w.IsActive);
        }

        var workflows = await query.ToListAsync();

        var workflowDtos = workflows.Select(w => new WorkflowDto
        {
            Id = w.Id,
            ServiceId = w.ServiceId,
            Name = w.Name,
            IsActive = w.IsActive,
            Definition = !string.IsNullOrEmpty(w.Definition)
                ? JsonSerializer.Deserialize<object>(w.Definition)
                : null,
            CreatedAt = w.Created
        }).ToList();

        return Ok(workflowDtos);
    }

    /// <summary>
    /// Get workflow by ID
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult<WorkflowDto>> GetWorkflow(int id)
    {
        var workflow = await _context.Workflows
            .Include(w => w.Service)
            .Include(w => w.Steps.OrderBy(s => s.StepOrder))
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null)
        {
            return NotFound();
        }

        var workflowDto = new WorkflowDto
        {
            Id = workflow.Id,
            ServiceId = workflow.ServiceId,
            Name = workflow.Name,
            IsActive = workflow.IsActive,
            Definition = !string.IsNullOrEmpty(workflow.Definition)
                ? JsonSerializer.Deserialize<object>(workflow.Definition)
                : null,
            CreatedAt = workflow.Created
        };

        return Ok(workflowDto);
    }

    /// <summary>
    /// Get workflow steps
    /// </summary>
    [HttpGet("{id}/steps")]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult<List<WorkflowStepDto>>> GetWorkflowSteps(int id)
    {
        var steps = await _context.WorkflowSteps
            .Where(s => s.WorkflowId == id)
            .OrderBy(s => s.StepOrder)
            .AsNoTracking()
            .ToListAsync();

        var stepDtos = steps.Select(s => new WorkflowStepDto
        {
            Id = s.Id,
            WorkflowId = s.WorkflowId,
            StepOrder = s.StepOrder,
            Name = s.Name,
            StepType = s.StepType.ToString(),
            AssignedRole = s.AssignedRole,
            AssignedDepartment = s.AssignedDepartment,
            RequiresAllApprovers = s.RequiresAllApprovers,
            Condition = !string.IsNullOrEmpty(s.Condition)
                ? JsonSerializer.Deserialize<object>(s.Condition)
                : null,
            SlaHours = s.SlaHours,
            CreatedAt = s.Created
        }).ToList();

        return Ok(stepDtos);
    }

    /// <summary>
    /// Create new workflow
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> CreateWorkflow([FromBody] CreateWorkflowDto dto)
    {
        var workflow = new Workflow
        {
            ServiceId = dto.ServiceId,
            Name = dto.Name,
            IsActive = dto.IsActive,
            Definition = dto.Definition != null ? JsonSerializer.Serialize(dto.Definition) : "{}",
            Created = DateTime.Now
        };

        _context.Workflows.Add(workflow);
        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(workflow.Id);
    }

    /// <summary>
    /// Update workflow
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateWorkflow(int id, [FromBody] CreateWorkflowDto dto)
    {
        var workflow = await _context.Workflows.FindAsync(id);
        if (workflow == null)
        {
            return NotFound();
        }

        workflow.Name = dto.Name;
        workflow.IsActive = dto.IsActive;
        workflow.Definition = dto.Definition != null ? JsonSerializer.Serialize(dto.Definition) : "{}";

        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    /// <summary>
    /// Delete workflow
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteWorkflow(int id)
    {
        var workflow = await _context.Workflows.FindAsync(id);
        if (workflow == null)
        {
            return NotFound();
        }

        _context.Workflows.Remove(workflow);
        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    /// <summary>
    /// Validate workflow structure
    /// </summary>
    [HttpGet("{id}/validate")]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult<object>> ValidateWorkflow(int id)
    {
        var result = await _workflowEngine.ValidateWorkflowAsync(id);

        return Ok(new
        {
            is_valid = result.IsValid,
            errors = result.Errors,
            warnings = result.Warnings
        });
    }

    /// <summary>
    /// Add step to workflow
    /// </summary>
    [HttpPost("{workflowId}/steps")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> AddStep(int workflowId, [FromBody] CreateWorkflowStepDto dto)
    {
        var workflow = await _context.Workflows.FindAsync(workflowId);
        if (workflow == null)
        {
            return NotFound("Workflow not found");
        }

        var step = new WorkflowStep
        {
            WorkflowId = workflowId,
            StepOrder = dto.StepOrder,
            Name = dto.Name,
            StepType = Enum.Parse<Domain.Enums.StepType>(dto.StepType),
            AssignedRole = dto.AssignedRole,
            AssignedDepartment = dto.AssignedDepartment,
            RequiresAllApprovers = dto.RequiresAllApprovers,
            Condition = dto.Condition != null ? JsonSerializer.Serialize(dto.Condition) : null,
            SlaHours = dto.SlaHours,
            Created = DateTime.Now
        };

        _context.WorkflowSteps.Add(step);
        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(step.Id);
    }

    /// <summary>
    /// Update workflow step
    /// </summary>
    [HttpPut("{workflowId}/steps/{stepId}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateStep(int workflowId, int stepId, [FromBody] CreateWorkflowStepDto dto)
    {
        var step = await _context.WorkflowSteps
            .FirstOrDefaultAsync(s => s.Id == stepId && s.WorkflowId == workflowId);

        if (step == null)
        {
            return NotFound();
        }

        step.StepOrder = dto.StepOrder;
        step.Name = dto.Name;
        step.StepType = Enum.Parse<Domain.Enums.StepType>(dto.StepType);
        step.AssignedRole = dto.AssignedRole;
        step.AssignedDepartment = dto.AssignedDepartment;
        step.RequiresAllApprovers = dto.RequiresAllApprovers;
        step.Condition = dto.Condition != null ? JsonSerializer.Serialize(dto.Condition) : null;
        step.SlaHours = dto.SlaHours;

        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    /// <summary>
    /// Delete workflow step
    /// </summary>
    [HttpDelete("{workflowId}/steps/{stepId}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteStep(int workflowId, int stepId)
    {
        var step = await _context.WorkflowSteps
            .FirstOrDefaultAsync(s => s.Id == stepId && s.WorkflowId == workflowId);

        if (step == null)
        {
            return NotFound();
        }

        _context.WorkflowSteps.Remove(step);
        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    // ==================== SUBWORKFLOW ENDPOINTS ====================

    /// <summary>
    /// Get all subworkflows for a parent request
    /// </summary>
    [HttpGet("requests/{requestId}/subworkflows")]
    [Authorize(Roles = "Admin,ServiceOwner,Approver")]
    public async Task<ActionResult<List<SubWorkflowInfo>>> GetRequestSubWorkflows(int requestId)
    {
        var subworkflows = await _subWorkflowEngine.GetActiveSubWorkflowsAsync(requestId, CancellationToken.None);
        return Ok(subworkflows);
    }

    /// <summary>
    /// Check if a subworkflow is complete
    /// </summary>
    [HttpGet("subworkflows/{childRequestId}/status")]
    [Authorize(Roles = "Admin,ServiceOwner,Approver")]
    public async Task<ActionResult<object>> GetSubWorkflowStatus(int childRequestId)
    {
        var isComplete = await _subWorkflowEngine.IsSubWorkflowCompleteAsync(childRequestId, CancellationToken.None);

        SubWorkflowResult? result = null;
        if (isComplete)
        {
            result = await _subWorkflowEngine.GetSubWorkflowResultAsync(childRequestId, CancellationToken.None);
        }

        return Ok(new
        {
            child_request_id = childRequestId,
            is_complete = isComplete,
            result = result
        });
    }

    /// <summary>
    /// Trigger a subworkflow manually (for testing/admin purposes)
    /// </summary>
    [HttpPost("requests/{requestId}/subworkflows")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> TriggerSubWorkflow(
        int requestId,
        [FromBody] TriggerSubWorkflowDto dto)
    {
        var result = await _subWorkflowEngine.TriggerSubWorkflowAsync(
            requestId,
            dto.ParentStepId,
            dto.ChildServiceId,
            dto.InheritedData ?? new Dictionary<string, object>(),
            CancellationToken.None);

        if (!result.Success)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return Ok(new
        {
            success = true,
            child_request_id = result.ChildRequestId,
            message = result.Message
        });
    }

    // ==================== ANALYTICS ENDPOINTS ====================

    /// <summary>
    /// Get workflow execution analytics
    /// </summary>
    [HttpGet("{id}/analytics")]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult<object>> GetWorkflowAnalytics(int id)
    {
        // Get all requests that used this workflow
        var workflow = await _context.Workflows
            .Include(w => w.Service)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null)
        {
            return NotFound();
        }

        var requests = await _context.Requests
            .Where(r => r.ServiceId == workflow.ServiceId)
            .Include(r => r.Actions)
            .Include(r => r.ActiveSteps)
            .ToListAsync();

        var completedRequests = requests.Where(r => r.CompletedAt != null).ToList();
        var averageCompletionTime = completedRequests.Any()
            ? completedRequests.Average(r => (r.CompletedAt!.Value - r.Created).TotalHours)
            : 0;

        var analytics = new
        {
            workflow_id = id,
            workflow_name = workflow.Name,
            service_name = workflow.Service.Name,
            total_requests = requests.Count,
            completed_requests = completedRequests.Count,
            in_progress_requests = requests.Count(r => r.Status == Domain.Enums.ServiceStatus.InProgress || r.Status == Domain.Enums.ServiceStatus.UnderReview),
            rejected_requests = requests.Count(r => r.Status == Domain.Enums.ServiceStatus.Rejected),
            average_completion_hours = Math.Round(averageCompletionTime, 2),
            completion_rate = requests.Count > 0 ? Math.Round((double)completedRequests.Count / requests.Count * 100, 2) : 0
        };

        return Ok(analytics);
    }

    /// <summary>
    /// Get workflow step performance metrics
    /// </summary>
    [HttpGet("{id}/step-metrics")]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult<List<object>>> GetStepMetrics(int id)
    {
        var workflow = await _context.Workflows
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null)
        {
            return NotFound();
        }

        var stepMetrics = new List<object>();

        foreach (var step in workflow.Steps.OrderBy(s => s.StepOrder))
        {
            // Get all active step records for this step
            var activeStepRecords = await _context.RequestActiveSteps
                .Where(ras => ras.StepId == step.Id && ras.Status == Domain.Enums.ActiveStepStatus.Completed)
                .ToListAsync();

            var averageDuration = activeStepRecords.Any() && activeStepRecords.All(r => r.CompletedAt != null)
                ? activeStepRecords.Average(r => (r.CompletedAt!.Value - r.StartedAt).TotalHours)
                : 0;

            stepMetrics.Add(new
            {
                step_id = step.Id,
                step_name = step.Name,
                step_order = step.StepOrder,
                step_type = step.StepType.ToString(),
                times_executed = activeStepRecords.Count,
                average_duration_hours = Math.Round(averageDuration, 2)
            });
        }

        return Ok(stepMetrics);
    }
}

/// <summary>
/// DTO for triggering subworkflow
/// </summary>
public class TriggerSubWorkflowDto
{
    [System.Text.Json.Serialization.JsonPropertyName("parent_step_id")]
    public int ParentStepId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("child_service_id")]
    public int ChildServiceId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("inherited_data")]
    public Dictionary<string, object>? InheritedData { get; set; }
}

/// <summary>
/// DTO for creating workflow step
/// </summary>
public class CreateWorkflowStepDto
{
    [System.Text.Json.Serialization.JsonPropertyName("step_order")]
    public int StepOrder { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("step_type")]
    public string StepType { get; set; } = "Approval";

    [System.Text.Json.Serialization.JsonPropertyName("assigned_role")]
    public string? AssignedRole { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("assigned_department")]
    public string? AssignedDepartment { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("requires_all_approvers")]
    public bool RequiresAllApprovers { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("condition")]
    public object? Condition { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("sla_hours")]
    public int? SlaHours { get; set; }
}
