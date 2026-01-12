using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Infrastructure.BackgroundJobs;
using HelpDesk.Infrastructure.Persistence;
using HelpDesk.Infrastructure.Persistence.Interceptors;
using HelpDesk.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HelpDesk.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<AuditableEntityInterceptor>();

        services.AddDbContext<HelpDeskDbContext>((sp, options) =>
        {
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"),
                builder => builder.MigrationsAssembly(typeof(HelpDeskDbContext).Assembly.FullName));
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<HelpDeskDbContext>());
        services.AddScoped<ApplicationDbContextInitialiser>();

        // Workflow Services
        services.AddScoped<IWorkflowEngine, WorkflowEngine>();
        services.AddScoped<IConditionEvaluator, ConditionEvaluator>();
        services.AddScoped<ISubWorkflowEngine, SubWorkflowEngine>();

        // Notification & SLA Services
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ISlaCalculator, SlaCalculator>();
        services.AddScoped<IEscalationService, EscalationService>();

        // Analytics Services
        services.AddScoped<IAnalyticsService, AnalyticsService>();

        // Background Jobs
        services.AddHostedService<SlaMonitoringService>();

        return services;
    }
}
