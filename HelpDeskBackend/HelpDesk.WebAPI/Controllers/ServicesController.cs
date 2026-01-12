using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Application.DTOs;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HelpDesk.WebAPI.Controllers;

[Authorize]
public class ServicesController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;

    public ServicesController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    [OutputCache(Duration = 60)]
    public async Task<ActionResult<List<Service>>> GetServices()
    {
        return await _context.Services
            .AsNoTracking()
            .Where(s => s.IsActive)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<Service>> GetService(int id)
    {
        var service = await _context.Services.FindAsync(id);

        if (service == null)
        {
            return NotFound();
        }

        return service;
    }

    [HttpGet("{id}/workflow")]
    public async Task<ActionResult<Workflow>> GetServiceWorkflow(int id)
    {
        var workflow = await _context.Workflows
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.ServiceId == id);

        if (workflow == null)
        {
            return NotFound("No workflow configured for this service");
        }

        return workflow;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> CreateService([FromBody] CreateServiceDto dto)
    {
        var service = new Service
        {
            ServiceKey = dto.Key,
            Name = dto.Name,
            Description = dto.Description ?? string.Empty,
            Icon = dto.Icon,
            OwningDepartment = dto.OwningDepartment ?? string.Empty,
            DefaultSlaHours = dto.DefaultSlaHours,
            IsActive = true,
            Status = ServiceLifecycleStatus.Active,
            FormSchema = dto.FormSchema != null ? JsonSerializer.Serialize(dto.FormSchema) : "{}",
            Created = DateTime.Now
        };

        _context.Services.Add(service);
        await _context.SaveChangesAsync(CancellationToken.None);
        return Ok(service.Id);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateService(int id, [FromBody] UpdateServiceDto dto)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null) return NotFound();

        if (!string.IsNullOrEmpty(dto.Name))
            service.Name = dto.Name;

        if (dto.Description != null)
            service.Description = dto.Description;

        if (!string.IsNullOrEmpty(dto.OwningDepartment))
            service.OwningDepartment = dto.OwningDepartment;

        if (dto.DefaultSlaHours.HasValue)
            service.DefaultSlaHours = dto.DefaultSlaHours.Value;

        if (!string.IsNullOrEmpty(dto.Icon))
            service.Icon = dto.Icon;

        if (dto.IsActive.HasValue)
            service.IsActive = dto.IsActive.Value;

        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<ServiceLifecycleStatus>(dto.Status, out var status))
            service.Status = status;

        if (dto.FormSchema != null)
            service.FormSchema = JsonSerializer.Serialize(dto.FormSchema);

        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateServiceStatus(int id, [FromBody] UpdateServiceStatusDto dto)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null) return NotFound();

        if (Enum.TryParse<ServiceLifecycleStatus>(dto.Status, out var status))
        {
            service.Status = status;
            await _context.SaveChangesAsync(CancellationToken.None);
            return NoContent();
        }

        return BadRequest("Invalid status value");
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteService(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null) return NotFound();

        _context.Services.Remove(service);
        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<Service>>> GetAllServicesAdmin()
    {
        return await _context.Services
            .AsNoTracking()
            .ToListAsync();
    }
}

// DTO for status update
public class UpdateServiceStatusDto
{
    [System.Text.Json.Serialization.JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}
