using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HelpDesk.WebAPI.Controllers;

/// <summary>
/// Integration endpoints for external systems
/// </summary>
[Authorize(Roles = "Admin")]
public class IntegrationsController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;

    public IntegrationsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Sync users from HR system
    /// </summary>
    [HttpPost("hr-sync")]
    public async Task<ActionResult<object>> SyncFromHr([FromBody] HrSyncRequestDto dto)
    {
        var stats = new
        {
            total_processed = 0,
            created = 0,
            updated = 0,
            errors = new List<string>()
        };

        var totalProcessed = 0;
        var created = 0;
        var updated = 0;
        var errors = new List<string>();

        foreach (var hrUser in dto.Users)
        {
            totalProcessed++;

            try
            {
                // Check if user exists
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == hrUser.Email);

                if (existingUser == null)
                {
                    // Create new user
                    var newUser = new User
                    {
                        Email = hrUser.Email,
                        FullName = hrUser.FullName,
                        Department = hrUser.Department ?? "General",
                        Role = UserRole.Employee,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("TempPassword123!"), // Temp password
                        EmployeeId = hrUser.EmployeeId,
                        HrData = hrUser.HrData != null ? JsonSerializer.Serialize(hrUser.HrData) : null,
                        Created = DateTime.Now
                    };

                    _context.Users.Add(newUser);
                    created++;
                }
                else
                {
                    // Update existing user
                    existingUser.FullName = hrUser.FullName;
                    existingUser.Department = hrUser.Department ?? existingUser.Department;
                    existingUser.EmployeeId = hrUser.EmployeeId;
                    existingUser.HrData = hrUser.HrData != null ? JsonSerializer.Serialize(hrUser.HrData) : existingUser.HrData;

                    updated++;
                }
            }
            catch (Exception ex)
            {
                errors.Add($"Error processing user {hrUser.Email}: {ex.Message}");
            }
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(new
        {
            total_processed = totalProcessed,
            created,
            updated,
            errors
        });
    }

    /// <summary>
    /// Link manager relationships
    /// </summary>
    [HttpPost("link-managers")]
    public async Task<ActionResult<object>> LinkManagers([FromBody] ManagerLinkDto dto)
    {
        var updated = 0;
        var errors = new List<string>();

        foreach (var link in dto.Links)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == link.EmployeeEmail);
                var manager = await _context.Users.FirstOrDefaultAsync(u => u.Email == link.ManagerEmail);

                if (user == null)
                {
                    errors.Add($"Employee not found: {link.EmployeeEmail}");
                    continue;
                }

                if (manager == null)
                {
                    errors.Add($"Manager not found: {link.ManagerEmail}");
                    continue;
                }

                user.DirectManagerId = manager.Id;
                updated++;
            }
            catch (Exception ex)
            {
                errors.Add($"Error linking {link.EmployeeEmail} to {link.ManagerEmail}: {ex.Message}");
            }
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(new
        {
            updated,
            errors
        });
    }
}

/// <summary>
/// HR sync request DTO
/// </summary>
public class HrSyncRequestDto
{
    [System.Text.Json.Serialization.JsonPropertyName("users")]
    public List<HrUserDto> Users { get; set; } = new();
}

/// <summary>
/// HR user DTO
/// </summary>
public class HrUserDto
{
    [System.Text.Json.Serialization.JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("department")]
    public string? Department { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("employee_id")]
    public string? EmployeeId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("hr_data")]
    public object? HrData { get; set; }
}

/// <summary>
/// Manager link DTO
/// </summary>
public class ManagerLinkDto
{
    [System.Text.Json.Serialization.JsonPropertyName("links")]
    public List<ManagerLinkItemDto> Links { get; set; } = new();
}

/// <summary>
/// Manager link item DTO
/// </summary>
public class ManagerLinkItemDto
{
    [System.Text.Json.Serialization.JsonPropertyName("employee_email")]
    public string EmployeeEmail { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("manager_email")]
    public string ManagerEmail { get; set; } = string.Empty;
}
