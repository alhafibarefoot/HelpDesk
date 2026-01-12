using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

/// <summary>
/// Service DTO with full details
/// </summary>
public class ServiceDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("owning_department")]
    public string? OwningDepartment { get; set; }

    [JsonPropertyName("default_sla_hours")]
    public int DefaultSlaHours { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("icon")]
    public string Icon { get; set; } = "Briefcase";

    [JsonPropertyName("form_schema")]
    public object? FormSchema { get; set; } // Will be deserialized JSON

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Create new service
/// </summary>
public class CreateServiceDto
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("owning_department")]
    public string? OwningDepartment { get; set; }

    [JsonPropertyName("default_sla_hours")]
    public int DefaultSlaHours { get; set; } = 24;

    [JsonPropertyName("icon")]
    public string Icon { get; set; } = "Briefcase";

    [JsonPropertyName("form_schema")]
    public object? FormSchema { get; set; }
}

/// <summary>
/// Update existing service
/// </summary>
public class UpdateServiceDto
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("owning_department")]
    public string? OwningDepartment { get; set; }

    [JsonPropertyName("default_sla_hours")]
    public int? DefaultSlaHours { get; set; }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("form_schema")]
    public object? FormSchema { get; set; }
}
