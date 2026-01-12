using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Application.DTOs;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.WebAPI.Controllers;

[Authorize]
public class RequestsController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IWorkflowEngine _workflowEngine;

    public RequestsController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IWorkflowEngine workflowEngine)
    {
        _context = context;
        _currentUserService = currentUserService;
        _workflowEngine = workflowEngine;
    }

    [HttpGet]
    public async Task<ActionResult<List<Request>>> GetMyRequests()
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        return await _context.Requests
            .Include(r => r.Requester)
            .Include(r => r.Service)
            .Include(r => r.FormValue)
            .Where(r => r.RequesterId == userId)
            .AsNoTracking()
            .OrderByDescending(r => r.Created)
            .ToListAsync();
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult<List<Request>>> GetAllRequests(
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] int? serviceId = null)
    {
        var query = _context.Requests
            .Include(r => r.Requester)
            .Include(r => r.Service)
            .Include(r => r.FormValue)
            .AsNoTracking();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(r => r.Status.ToString() == status);
        }

        if (!string.IsNullOrEmpty(priority))
        {
            query = query.Where(r => r.Priority.ToString() == priority);
        }

        if (serviceId.HasValue)
        {
            query = query.Where(r => r.ServiceId == serviceId.Value);
        }

        return await query.OrderByDescending(r => r.Created).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Request>> GetRequest(int id)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .Include(r => r.Service)
            .Include(r => r.Actions)
            .Include(r => r.FormValue)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null)
        {
            return NotFound();
        }

        return request;
    }

    [HttpPost]
    public async Task<ActionResult<object>> SubmitRequest([FromBody] CreateRequestDto dto)
    {
         var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        // 1. Create Request Entity
        var request = new Request
        {
            ServiceId = dto.ServiceId,
            RequesterId = userId,
            Title = dto.Title ?? "New Request",
            Description = dto.Description,
            Status = ServiceStatus.New,
            Priority = RequestPriority.Medium,
            Created = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        // 2. Generate Number
        request.RequestNumber = $"REQ-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}";

        // 3. Save Request to get ID
        _context.Requests.Add(request);
        await _context.SaveChangesAsync(CancellationToken.None);

        // 4. Create and Link Form Value
        var formValue = new RequestFormValue
        {
             RequestId = request.Id,
             FormData = System.Text.Json.JsonSerializer.Serialize(dto.FormData)
        };

        request.FormValue = formValue;

        await _context.SaveChangesAsync(CancellationToken.None);

        // 5. Initialize Workflow
        var workflowResult = await _workflowEngine.InitializeWorkflowAsync(request.Id, dto.ServiceId, CancellationToken.None);

        return Ok(new
        {
            id = request.Id,
            request_number = request.RequestNumber,
            workflow_initialized = workflowResult.Success,
            workflow_message = workflowResult.Message
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateRequest(int id, [FromBody] UpdateRequestDto dto)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
        {
            return NotFound();
        }

        // Update fields if provided
        if (!string.IsNullOrEmpty(dto.Title))
            request.Title = dto.Title;

        if (dto.Description != null)
            request.Description = dto.Description;

        if (!string.IsNullOrEmpty(dto.Priority) && Enum.TryParse<RequestPriority>(dto.Priority, out var priority))
            request.Priority = priority;

        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<ServiceStatus>(dto.Status, out var status))
            request.Status = status;

        request.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }

    [HttpPut("{id}/priority")]
    [Authorize(Roles = "Admin,ServiceOwner,Approver")]
    public async Task<ActionResult> UpdatePriority(int id, [FromBody] UpdateRequestPriorityDto dto)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
        {
            return NotFound();
        }

        if (Enum.TryParse<RequestPriority>(dto.Priority, out var priority))
        {
            request.Priority = priority;
            request.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync(CancellationToken.None);
            return NoContent();
        }

        return BadRequest("Invalid priority value");
    }

    [HttpPut("{id}/assign")]
    [Authorize(Roles = "Admin,ServiceOwner")]
    public async Task<ActionResult> AssignRequest(int id, [FromBody] AssignRequestDto dto)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrEmpty(dto.Department))
        {
            request.Department = dto.Department;
        }

        request.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync(CancellationToken.None);

        return NoContent();
    }
}
