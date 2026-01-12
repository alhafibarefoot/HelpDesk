using HelpDesk.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace HelpDesk.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    // Core Entities
    DbSet<User> Users { get; }
    DbSet<Service> Services { get; }
    DbSet<Workflow> Workflows { get; }
    DbSet<WorkflowStep> WorkflowSteps { get; }
    DbSet<Request> Requests { get; }
    DbSet<RequestFormValue> RequestFormValues { get; }
    DbSet<RequestAction> RequestActions { get; }

    // Collaboration Entities
    DbSet<RequestComment> RequestComments { get; }
    DbSet<RequestAttachment> RequestAttachments { get; }

    // Event & Tracking Entities
    DbSet<RequestEvent> RequestEvents { get; }
    DbSet<RequestActiveStep> RequestActiveSteps { get; }

    // Notification Entities
    DbSet<Notification> Notifications { get; }
    DbSet<NotificationPreference> NotificationPreferences { get; }

    // Permission Entities
    DbSet<StepFieldPermission> StepFieldPermissions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

public interface ICurrentUserService
{
    string? UserId { get; }
}
