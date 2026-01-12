using HelpDesk.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.WebAPI.Controllers;

/// <summary>
/// Admin-only endpoints for system management
/// </summary>
[Authorize(Roles = "Admin")]
public class AdminController : ApiControllerBase
{
    private readonly IAnalyticsService _analyticsService;
    private readonly IApplicationDbContext _context;

    public AdminController(IAnalyticsService analyticsService, IApplicationDbContext context)
    {
        _analyticsService = analyticsService;
        _context = context;
    }

    /// <summary>
    /// Get system analytics
    /// </summary>
    [HttpGet("analytics")]
    public async Task<ActionResult<object>> GetAnalytics([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var requestVolume = await _analyticsService.GetRequestVolumeByServiceAsync(fromDate, toDate);
        var avgResolutionTime = await _analyticsService.GetAverageResolutionTimeAsync();
        var slaCompliance = await _analyticsService.GetSlaComplianceRateAsync();
        var statusDistribution = await _analyticsService.GetRequestStatusDistributionAsync();
        var userWorkload = await _analyticsService.GetUserWorkloadDistributionAsync();

        return Ok(new
        {
            request_volume_by_service = requestVolume,
            average_resolution_time = avgResolutionTime,
            sla_compliance = new
            {
                total_requests = slaCompliance.TotalRequests,
                on_time = slaCompliance.OnTime,
                breached = slaCompliance.Breached,
                compliance_rate = slaCompliance.ComplianceRate
            },
            status_distribution = statusDistribution,
            user_workload = userWorkload
        });
    }

    /// <summary>
    /// Get dashboard summary
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<object>> GetDashboard()
    {
        var summary = await _analyticsService.GetDashboardSummaryAsync();

        return Ok(new
        {
            total_requests = summary.TotalRequests,
            active_requests = summary.ActiveRequests,
            completed_requests = summary.CompletedRequests,
            overdue_requests = summary.OverdueRequests,
            average_resolution_hours = summary.AverageResolutionHours,
            sla_compliance_rate = summary.SlaComplianceRate,
            requests_by_status = summary.RequestsByStatus,
            requests_by_priority = summary.RequestsByPriority
        });
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public ActionResult<object> GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.Now,
            version = "1.0.0"
        });
    }

    /// <summary>
    /// Get system statistics
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetStats()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalServices = await _context.Services.CountAsync();
        var totalRequests = await _context.Requests.CountAsync();
        var totalWorkflows = await _context.Workflows.CountAsync();

        return Ok(new
        {
            total_users = totalUsers,
            total_services = totalServices,
            total_requests = totalRequests,
            total_workflows = totalWorkflows
        });
    }
}
