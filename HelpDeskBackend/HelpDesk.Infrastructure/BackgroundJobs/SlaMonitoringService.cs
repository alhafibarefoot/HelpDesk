using HelpDesk.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace HelpDesk.Infrastructure.BackgroundJobs;

/// <summary>
/// Background service for SLA monitoring and escalation
/// </summary>
public class SlaMonitoringService : BackgroundService
{
    private readonly ILogger<SlaMonitoringService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15); // Run every 15 minutes

    public SlaMonitoringService(
        ILogger<SlaMonitoringService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SLA Monitoring Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DoWorkAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SLA Monitoring Service");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("SLA Monitoring Service stopped");
    }

    private async Task DoWorkAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();

        var escalationService = scope.ServiceProvider.GetRequiredService<IEscalationService>();
        var slaCalculator = scope.ServiceProvider.GetRequiredService<ISlaCalculator>();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        _logger.LogInformation("Running SLA monitoring check at {Time}", DateTime.Now);

        // 1. Check for escalations
        var escalationResult = await escalationService.CheckEscalationsAsync(cancellationToken);

        if (escalationResult.EscalatedCount > 0)
        {
            _logger.LogWarning(
                "Escalated {Count} requests: {RequestIds}",
                escalationResult.EscalatedCount,
                string.Join(", ", escalationResult.EscalatedRequestIds));
        }

        // 2. Check for SLA warnings (2 hours remaining)
        var requestsNearingDue = await context.Requests
            .Where(r => r.SlaDeAt != null
                     && r.Status != Domain.Enums.ServiceStatus.Completed
                     && r.Status != Domain.Enums.ServiceStatus.Rejected
                     && r.Status != Domain.Enums.ServiceStatus.Cancelled)
            .ToListAsync(cancellationToken);

        foreach (var request in requestsNearingDue)
        {
            if (request.SlaDeAt == null) continue;

            var hoursRemaining = slaCalculator.GetHoursRemaining(request.SlaDeAt);

            // Send warning at 2 hours remaining
            if (hoursRemaining > 0 && hoursRemaining <= 2)
            {
                await notificationService.NotifySlaWarningAsync(
                    request.Id,
                    (int)Math.Ceiling(hoursRemaining),
                    cancellationToken);
            }
        }

        _logger.LogInformation(
            "SLA monitoring check completed. Checked {Total} requests, escalated {Escalated}",
            escalationResult.TotalChecked,
            escalationResult.EscalatedCount);
    }
}
