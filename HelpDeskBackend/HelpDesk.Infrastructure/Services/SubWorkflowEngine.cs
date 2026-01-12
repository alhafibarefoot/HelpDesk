using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HelpDesk.Infrastructure.Services;

/// <summary>
/// SubWorkflow engine implementation for nested workflow execution
/// </summary>
public class SubWorkflowEngine : ISubWorkflowEngine
{
    private readonly IApplicationDbContext _context;

    public SubWorkflowEngine(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SubWorkflowExecutionResult> TriggerSubWorkflowAsync(
        int parentRequestId,
        int parentStepId,
        int childServiceId,
        Dictionary<string, object> inheritedData,
        CancellationToken cancellationToken = default)
    {
        var result = new SubWorkflowExecutionResult();

        try
        {
            // 1. Get parent request
            var parentRequest = await _context.Requests
                .Include(r => r.Requester)
                .FirstOrDefaultAsync(r => r.Id == parentRequestId, cancellationToken);

            if (parentRequest == null)
            {
                result.Errors.Add("Parent request not found");
                return result;
            }

            // 2. Get child service
            var childService = await _context.Services
                .FirstOrDefaultAsync(s => s.Id == childServiceId, cancellationToken);

            if (childService == null)
            {
                result.Errors.Add("Child service not found");
                return result;
            }

            // 3. Create child request
            var childRequest = new Request
            {
                ServiceId = childServiceId,
                RequesterId = parentRequest.RequesterId,
                Title = $"SubWorkflow: {childService.Name} (Parent: {parentRequest.RequestNumber})",
                Description = $"Automatically triggered from parent request {parentRequest.RequestNumber}",
                Status = ServiceStatus.New,
                Priority = parentRequest.Priority,
                Department = parentRequest.Department,
                Created = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Requests.Add(childRequest);
            await _context.SaveChangesAsync(cancellationToken);

            // Generate request number
            childRequest.RequestNumber = $"REQ-{childRequest.Id:D6}";

            // 4. Create form value with inherited data
            var formValue = new RequestFormValue
            {
                RequestId = childRequest.Id,
                FormData = JsonSerializer.Serialize(inheritedData),
                Created = DateTime.Now
            };

            _context.RequestFormValues.Add(formValue);

            // 5. Create a RequestEvent to link parent and child
            var linkEvent = new RequestEvent
            {
                RequestId = parentRequestId,
                EventType = "SubWorkflowTriggered",
                PerformedBy = parentRequest.RequesterId,
                PerformedAt = DateTime.Now,
                Payload = JsonSerializer.Serialize(new
                {
                    ChildRequestId = childRequest.Id,
                    ChildServiceId = childServiceId,
                    ParentStepId = parentStepId
                }),
                Meta = JsonSerializer.Serialize(new { ChildRequestNumber = childRequest.RequestNumber })
            };

            _context.RequestEvents.Add(linkEvent);
            await _context.SaveChangesAsync(cancellationToken);

            // Set child request status to New - parent will initialize workflow when needed
            childRequest.Status = ServiceStatus.New;
            await _context.SaveChangesAsync(cancellationToken);

            result.Success = true;
            result.Message = $"SubWorkflow triggered: {childRequest.RequestNumber}";
            result.ChildRequestId = childRequest.Id;
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Error triggering subworkflow: {ex.Message}");
        }

        return result;
    }

    public async Task<bool> IsSubWorkflowCompleteAsync(int childRequestId, CancellationToken cancellationToken = default)
    {
        var childRequest = await _context.Requests
            .FirstOrDefaultAsync(r => r.Id == childRequestId, cancellationToken);

        if (childRequest == null) return false;

        return childRequest.Status == ServiceStatus.Completed ||
               childRequest.Status == ServiceStatus.Rejected ||
               childRequest.Status == ServiceStatus.Cancelled;
    }

    public async Task<SubWorkflowResult?> GetSubWorkflowResultAsync(int childRequestId, CancellationToken cancellationToken = default)
    {
        var childRequest = await _context.Requests
            .Include(r => r.FormValue)
            .FirstOrDefaultAsync(r => r.Id == childRequestId, cancellationToken);

        if (childRequest == null || childRequest.CompletedAt == null)
        {
            return null;
        }

        var outputData = new Dictionary<string, object>();
        if (!string.IsNullOrEmpty(childRequest.FormValue?.FormData))
        {
            try
            {
                outputData = JsonSerializer.Deserialize<Dictionary<string, object>>(childRequest.FormValue.FormData) ?? new();
            }
            catch
            {
                // Handle deserialization error
            }
        }

        return new SubWorkflowResult
        {
            RequestId = childRequest.Id,
            Status = childRequest.Status.ToString(),
            OutputData = outputData,
            CompletedAt = childRequest.CompletedAt.Value
        };
    }

    public async Task<List<SubWorkflowInfo>> GetActiveSubWorkflowsAsync(int parentRequestId, CancellationToken cancellationToken = default)
    {
        // Find all subworkflows triggered by this parent request
        var subworkflowEvents = await _context.RequestEvents
            .Where(e => e.RequestId == parentRequestId && e.EventType == "SubWorkflowTriggered")
            .ToListAsync(cancellationToken);

        var childRequestIds = new List<int>();
        foreach (var evt in subworkflowEvents)
        {
            try
            {
                var payload = JsonSerializer.Deserialize<Dictionary<string, object>>(evt.Payload);
                if (payload != null && payload.ContainsKey("ChildRequestId"))
                {
                    var childIdElement = (JsonElement)payload["ChildRequestId"];
                    childRequestIds.Add(childIdElement.GetInt32());
                }
            }
            catch
            {
                // Skip invalid events
            }
        }

        var childRequests = await _context.Requests
            .Include(r => r.Service)
            .Where(r => childRequestIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        return childRequests.Select(r => new SubWorkflowInfo
        {
            ChildRequestId = r.Id,
            ChildServiceId = r.ServiceId,
            ChildServiceName = r.Service.Name,
            Status = r.Status.ToString(),
            CreatedAt = r.Created
        }).ToList();
    }
}
