using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

public class CreateRequestDto
{
    [JsonPropertyName("service_id")] // Explicit mapping
    public int ServiceId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "Normal";

    // Dynamic form data
    [JsonExtensionData]
    public Dictionary<string, object> FormData { get; set; } = new();
}
