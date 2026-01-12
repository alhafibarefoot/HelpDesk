using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

/// <summary>
/// Request action/audit trail
/// </summary>
public class RequestActionDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("request_id")]
    public int RequestId { get; set; }

    [JsonPropertyName("actor_id")]
    public int? ActorId { get; set; }

    [JsonPropertyName("action_type")]
    public string ActionType { get; set; } = string.Empty;

    [JsonPropertyName("from_step_id")]
    public int? FromStepId { get; set; }

    [JsonPropertyName("to_step_id")]
    public int? ToStepId { get; set; }

    [JsonPropertyName("from_step_key")]
    public string? FromStepKey { get; set; }

    [JsonPropertyName("to_step_key")]
    public string? ToStepKey { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("actor")]
    public UserDto? Actor { get; set; }
}

/// <summary>
/// Perform action on request
/// </summary>
public class PerformActionDto
{
    [JsonPropertyName("action_type")]
    public string ActionType { get; set; } = string.Empty;

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("to_step_id")]
    public int? ToStepId { get; set; }
}
