using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Application.DTOs;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.WebAPI.Controllers;

[Authorize]
public class UsersController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UsersController(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,ServiceOwner")]
    [OutputCache(Duration = 60)]
    public async Task<ActionResult<List<UserDto>>> GetUsers(
        [FromQuery] string? role = null,
        [FromQuery] string? department = null)
    {
        var query = _context.Users.AsNoTracking();

        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, out var userRole))
        {
            query = query.Where(u => u.Role == userRole);
        }

        if (!string.IsNullOrEmpty(department))
        {
            query = query.Where(u => u.Department == department);
        }

        var users = await query.OrderBy(u => u.FullName).ToListAsync();
        return users.Adapt<List<UserDto>>();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {
        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound();
        }

        return user.Adapt<UserDto>();
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        return user.Adapt<UserDto>();
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> CreateUser([FromBody] CreateUserDto dto)
    {
        var entity = dto.Adapt<User>();
        entity.Created = DateTime.Now;

        _context.Users.Add(entity);
        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(entity.Id);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int currentUserId))
        {
            return Unauthorized();
        }

        // Users can only update themselves unless they are admin
        if (id != currentUserId)
        {
            var currentUser = await _context.Users.FindAsync(currentUserId);
            if (currentUser?.Role != UserRole.Admin)
            {
                return Forbid();
            }
        }

        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrEmpty(dto.FullName))
            user.FullName = dto.FullName;

        if (!string.IsNullOrEmpty(dto.Department))
            user.Department = dto.Department;

        if (!string.IsNullOrEmpty(dto.AvatarUrl))
            user.AvatarUrl = dto.AvatarUrl;

        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    [HttpPut("{id}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateUserRole(int id, [FromBody] UpdateUserRoleDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        if (Enum.TryParse<UserRole>(dto.Role, out var role))
        {
            user.Role = role;
            await _context.SaveChangesAsync(CancellationToken.None);
            return NoContent();
        }

        return BadRequest("Invalid role value");
    }
}

// DTOs for user operations
public class CreateUserDto
{
    [System.Text.Json.Serialization.JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("role")]
    public string? Role { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("department")]
    public string? Department { get; set; }
}

public class UpdateUserDto
{
    [System.Text.Json.Serialization.JsonPropertyName("full_name")]
    public string? FullName { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("department")]
    public string? Department { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }
}

public class UpdateUserRoleDto
{
    [System.Text.Json.Serialization.JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;
}
