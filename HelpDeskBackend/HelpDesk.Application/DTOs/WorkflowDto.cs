using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

/// <summary>
/// Workflow definition
/// </summary>
public class WorkflowDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("service_id")]
    public int ServiceId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("definition")]
    public object? Definition { get; set; } // JSON workflow definition

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Workflow step
/// </summary>
public class WorkflowStepDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("workflow_id")]
    public int WorkflowId { get; set; }

    [JsonPropertyName("step_order")]
    public int StepOrder { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("step_type")]
    public string StepType { get; set; } = string.Empty;

    [JsonPropertyName("assigned_role")]
    public string? AssignedRole { get; set; }

    [JsonPropertyName("assigned_department")]
    public string? AssignedDepartment { get; set; }

    [JsonPropertyName("requires_all_approvers")]
    public bool RequiresAllApprovers { get; set; }

    [JsonPropertyName("condition")]
    public object? Condition { get; set; }

    [JsonPropertyName("sla_hours")]
    public int? SlaHours { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Create or update workflow
/// </summary>
public class CreateWorkflowDto
{
    [JsonPropertyName("service_id")]
    public int ServiceId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("definition")]
    public object? Definition { get; set; }
}
