using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Infrastructure.Services;

/// <summary>
/// Analytics service implementation
/// </summary>
public class AnalyticsService : IAnalyticsService
{
    private readonly IApplicationDbContext _context;
    private readonly ISlaCalculator _slaCalculator;

    public AnalyticsService(IApplicationDbContext context, ISlaCalculator slaCalculator)
    {
        _context = context;
        _slaCalculator = slaCalculator;
    }

    public async Task<Dictionary<string, int>> GetRequestVolumeByServiceAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Requests.AsQueryable();

        if (fromDate.HasValue)
        {
            query = query.Where(r => r.Created >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(r => r.Created <= toDate.Value);
        }

        var result = await query
            .Include(r => r.Service)
            .GroupBy(r => r.Service!.Name)
            .Select(g => new { ServiceName = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ServiceName, x => x.Count, cancellationToken);

        return result;
    }

    public async Task<Dictionary<string, double>> GetAverageResolutionTimeAsync(CancellationToken cancellationToken = default)
    {
        var result = await _context.Requests
            .Include(r => r.Service)
            .Where(r => r.CompletedAt != null)
            .GroupBy(r => r.Service!.Name)
            .Select(g => new
            {
                ServiceName = g.Key,
                AverageHours = g.Average(r => EF.Functions.DateDiffHour(r.Created, r.CompletedAt!.Value))
            })
            .ToDictionaryAsync(x => x.ServiceName, x => (double)x.AverageHours, cancellationToken);

        return result;
    }

    public async Task<SlaComplianceResult> GetSlaComplianceRateAsync(CancellationToken cancellationToken = default)
    {
        var completedRequests = await _context.Requests
            .Where(r => r.CompletedAt != null && r.SlaDeAt != null)
            .ToListAsync(cancellationToken);

        var result = new SlaComplianceResult
        {
            TotalRequests = completedRequests.Count
        };

        foreach (var request in completedRequests)
        {
            if (request.CompletedAt <= request.SlaDeAt)
            {
                result.OnTime++;
            }
            else
            {
                result.Breached++;
            }
        }

        result.ComplianceRate = result.TotalRequests > 0
            ? (double)result.OnTime / result.TotalRequests * 100
            : 0;

        return result;
    }

    public async Task<Dictionary<string, int>> GetRequestStatusDistributionAsync(CancellationToken cancellationToken = default)
    {
        var result = await _context.Requests
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, cancellationToken);

        return result;
    }

    public async Task<Dictionary<string, int>> GetUserWorkloadDistributionAsync(CancellationToken cancellationToken = default)
    {
        var result = await _context.Requests
            .Include(r => r.Requester)
            .Where(r => r.Status != ServiceStatus.Completed
                     && r.Status != ServiceStatus.Rejected
                     && r.Status != ServiceStatus.Cancelled)
            .GroupBy(r => r.Requester!.FullName)
            .Select(g => new { UserName = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserName, x => x.Count, cancellationToken);

        return result;
    }

    public async Task<DashboardSummary> GetDashboardSummaryAsync(CancellationToken cancellationToken = default)
    {
        var allRequests = await _context.Requests.ToListAsync(cancellationToken);

        var summary = new DashboardSummary
        {
            TotalRequests = allRequests.Count,
            ActiveRequests = allRequests.Count(r =>
                r.Status != ServiceStatus.Completed
                && r.Status != ServiceStatus.Rejected
                && r.Status != ServiceStatus.Cancelled),
            CompletedRequests = allRequests.Count(r => r.Status == ServiceStatus.Completed),
            OverdueRequests = allRequests.Count(r =>
                r.SlaDeAt != null && _slaCalculator.IsOverdue(r.SlaDeAt))
        };

        var completedRequests = allRequests.Where(r => r.CompletedAt != null).ToList();
        if (completedRequests.Any())
        {
            summary.AverageResolutionHours = completedRequests
                .Average(r => (r.CompletedAt!.Value - r.Created).TotalHours);
        }

        var slaCompliance = await GetSlaComplianceRateAsync(cancellationToken);
        summary.SlaComplianceRate = slaCompliance.ComplianceRate;

        summary.RequestsByStatus = allRequests
            .GroupBy(r => r.Status.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        summary.RequestsByPriority = allRequests
            .GroupBy(r => r.Priority.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        return summary;
    }
}
