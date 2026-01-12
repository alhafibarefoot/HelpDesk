using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

/// <summary>
/// File attachment on a request
/// </summary>
public class AttachmentDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("request_id")]
    public int RequestId { get; set; }

    [JsonPropertyName("file_name")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("file_url")]
    public string FileUrl { get; set; } = string.Empty;

    [JsonPropertyName("uploaded_by")]
    public int UploadedBy { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Upload file attachment
/// </summary>
public class CreateAttachmentDto
{
    [JsonPropertyName("file_name")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("file_data")]
    public string? FileData { get; set; } // Base64 encoded file data

    [JsonPropertyName("file_url")]
    public string? FileUrl { get; set; } // Or direct URL if already uploaded
}
