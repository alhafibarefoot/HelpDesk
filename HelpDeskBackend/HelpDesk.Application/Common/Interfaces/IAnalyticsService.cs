namespace HelpDesk.Application.Common.Interfaces;

/// <summary>
/// Service for calculating system analytics and metrics
/// </summary>
public interface IAnalyticsService
{
    /// <summary>
    /// Get request volume by service
    /// </summary>
    Task<Dictionary<string, int>> GetRequestVolumeByServiceAsync(DateTime? fromDate = null, DateTime? toDate = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get average resolution time by service
    /// </summary>
    Task<Dictionary<string, double>> GetAverageResolutionTimeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get SLA compliance rate
    /// </summary>
    Task<SlaComplianceResult> GetSlaComplianceRateAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get request status distribution
    /// </summary>
    Task<Dictionary<string, int>> GetRequestStatusDistributionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get user workload distribution
    /// </summary>
    Task<Dictionary<string, int>> GetUserWorkloadDistributionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get dashboard summary
    /// </summary>
    Task<DashboardSummary> GetDashboardSummaryAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// SLA compliance result
/// </summary>
public class SlaComplianceResult
{
    public int TotalRequests { get; set; }
    public int OnTime { get; set; }
    public int Breached { get; set; }
    public double ComplianceRate { get; set; }
}

/// <summary>
/// Dashboard summary
/// </summary>
public class DashboardSummary
{
    public int TotalRequests { get; set; }
    public int ActiveRequests { get; set; }
    public int CompletedRequests { get; set; }
    public int OverdueRequests { get; set; }
    public double AverageResolutionHours { get; set; }
    public double SlaComplianceRate { get; set; }
    public Dictionary<string, int> RequestsByStatus { get; set; } = new();
    public Dictionary<string, int> RequestsByPriority { get; set; } = new();
}
