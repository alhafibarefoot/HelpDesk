using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

/// <summary>
/// Comment on a request
/// </summary>
public class CommentDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("request_id")]
    public int RequestId { get; set; }

    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("mentions")]
    public List<string>? Mentions { get; set; }

    [JsonPropertyName("is_internal")]
    public bool IsInternal { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("user")]
    public UserDto? User { get; set; }
}

/// <summary>
/// Create new comment
/// </summary>
public class CreateCommentDto
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("mentions")]
    public List<string>? Mentions { get; set; }

    [JsonPropertyName("is_internal")]
    public bool IsInternal { get; set; } = false;
}
