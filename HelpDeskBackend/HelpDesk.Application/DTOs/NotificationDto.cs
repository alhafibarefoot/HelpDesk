using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

/// <summary>
/// User notification
/// </summary>
public class NotificationDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("is_read")]
    public bool IsRead { get; set; }

    [JsonPropertyName("link")]
    public string? Link { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Create notification
/// </summary>
public class CreateNotificationDto
{
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "Info";

    [JsonPropertyName("link")]
    public string? Link { get; set; }
}

/// <summary>
/// Notification preferences
/// </summary>
public class NotificationPreferenceDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("preferences")]
    public Dictionary<string, object> Preferences { get; set; } = new();
}
