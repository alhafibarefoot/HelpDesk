using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

/// <summary>
/// Request DTO with full details including related entities
/// </summary>
public class RequestDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("request_number")]
    public string RequestNumber { get; set; } = string.Empty;

    [JsonPropertyName("service_id")]
    public int ServiceId { get; set; }

    [JsonPropertyName("requester_id")]
    public int RequesterId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    public string? Department { get; set; }

    [JsonPropertyName("current_step_id")]
    public int? CurrentStepId { get; set; }

    [JsonPropertyName("current_step_key")]
    public string CurrentStepKey { get; set; } = "start";

    [JsonPropertyName("sla_due_at")]
    public DateTime? SlaDeAt { get; set; }

    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Related entities (optional, populated via Include)
    [JsonPropertyName("service")]
    public ServiceDto? Service { get; set; }

    [JsonPropertyName("requester")]
    public UserDto? Requester { get; set; }

    [JsonPropertyName("form_data")]
    public Dictionary<string, object>? FormData { get; set; }
}

/// <summary>
/// Update existing request
/// </summary>
public class UpdateRequestDto
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("priority")]
    public string? Priority { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}

/// <summary>
/// Update request priority
/// </summary>
public class UpdateRequestPriorityDto
{
    [JsonPropertyName("priority")]
    public string Priority { get; set; } = string.Empty;
}

/// <summary>
/// Assign request to user/department
/// </summary>
public class AssignRequestDto
{
    [JsonPropertyName("assigned_to")]
    public int? AssignedTo { get; set; }

    [JsonPropertyName("department")]
    public string? Department { get; set; }
}
