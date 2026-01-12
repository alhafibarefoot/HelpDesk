using HelpDesk.Application.Common.Interfaces;
using HelpDesk.Domain.Entities;
using HelpDesk.Domain.Enums;
using HelpDesk.Infrastructure.Persistence.Interceptors;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace HelpDesk.Infrastructure.Persistence;

public class HelpDeskDbContext : DbContext, IApplicationDbContext
{
    private readonly AuditableEntityInterceptor _auditableEntityInterceptor;

    public HelpDeskDbContext(
        DbContextOptions<HelpDeskDbContext> options,
        AuditableEntityInterceptor auditableEntityInterceptor)
        : base(options)
    {
        _auditableEntityInterceptor = auditableEntityInterceptor;
    }

    // Core Entities
    public DbSet<User> Users => Set<User>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();
    public DbSet<Request> Requests => Set<Request>();
    public DbSet<RequestFormValue> RequestFormValues => Set<RequestFormValue>();
    public DbSet<RequestAction> RequestActions => Set<RequestAction>();

    // Collaboration Entities
    public DbSet<RequestComment> RequestComments => Set<RequestComment>();
    public DbSet<RequestAttachment> RequestAttachments => Set<RequestAttachment>();

    // Event & Tracking Entities
    public DbSet<RequestEvent> RequestEvents => Set<RequestEvent>();
    public DbSet<RequestActiveStep> RequestActiveSteps => Set<RequestActiveStep>();

    // Notification Entities
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();

    // Permission Entities
    public DbSet<StepFieldPermission> StepFieldPermissions => Set<StepFieldPermission>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Apply configurations from assembly
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // ==================== USER CONFIGURATION ====================
        builder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Role).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Department).HasMaxLength(255);
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.EmployeeId).HasMaxLength(50);
            entity.Property(e => e.HrManagerId).HasMaxLength(50);

            // Self-referencing relationship for manager
            entity.HasOne(e => e.DirectManager)
                .WithMany()
                .HasForeignKey(e => e.DirectManagerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ==================== SERVICE CONFIGURATION ====================
        builder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ServiceKey).IsUnique();
            entity.Property(e => e.ServiceKey).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Icon).HasMaxLength(50);
            entity.Property(e => e.OwningDepartment).HasMaxLength(255);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);

            // One-to-one with Workflow
            entity.HasOne(e => e.Workflow)
                .WithOne(w => w.Service)
                .HasForeignKey<Workflow>(w => w.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ==================== WORKFLOW CONFIGURATION ====================
        builder.Entity<Workflow>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);

            // One-to-many with WorkflowSteps
            entity.HasMany(e => e.Steps)
                .WithOne(s => s.Workflow)
                .HasForeignKey(s => s.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ==================== WORKFLOW STEP CONFIGURATION ====================
        builder.Entity<WorkflowStep>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.StepType).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.AssignedRole).HasMaxLength(100);
            entity.Property(e => e.AssignedDepartment).HasMaxLength(255);

            entity.HasIndex(e => new { e.WorkflowId, e.StepOrder });
        });

        // ==================== REQUEST CONFIGURATION ====================
        builder.Entity<Request>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.RequestNumber).IsUnique();
            entity.Property(e => e.RequestNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Priority).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Department).HasMaxLength(255);
            entity.Property(e => e.CurrentStepKey).HasMaxLength(100);

            // Relationships
            entity.HasOne(e => e.Service)
                .WithMany(s => s.Requests)
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Requester)
                .WithMany(u => u.Requests)
                .HasForeignKey(e => e.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            // One-to-one with FormValue
            entity.HasOne(e => e.FormValue)
                .WithOne(f => f.Request)
                .HasForeignKey<RequestFormValue>(f => f.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for performance
            entity.HasIndex(e => e.ServiceId);
            entity.HasIndex(e => e.RequesterId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Created);
            entity.HasIndex(e => e.SlaDeAt);
        });

        // ==================== REQUEST FORM VALUE CONFIGURATION ====================
        builder.Entity<RequestFormValue>(entity =>
        {
            entity.HasKey(e => e.Id);
        });

        // ==================== REQUEST ACTION CONFIGURATION ====================
        builder.Entity<RequestAction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActionType).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.FromStepKey).HasMaxLength(100);
            entity.Property(e => e.ToStepKey).HasMaxLength(100);

            entity.HasOne(e => e.Request)
                .WithMany(r => r.Actions)
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Actor)
                .WithMany(u => u.RequestActions)
                .HasForeignKey(e => e.ActorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.RequestId, e.Created });
        });

        // ==================== REQUEST COMMENT CONFIGURATION ====================
        builder.Entity<RequestComment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();

            entity.HasOne(e => e.Request)
                .WithMany(r => r.Comments)
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.RequestComments)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.RequestId, e.Created });
        });

        // ==================== REQUEST ATTACHMENT CONFIGURATION ====================
        builder.Entity<RequestAttachment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FileUrl).IsRequired().HasMaxLength(1000);

            entity.HasOne(e => e.Request)
                .WithMany(r => r.Attachments)
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Uploader)
                .WithMany()
                .HasForeignKey(e => e.UploadedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.RequestId);
        });

        // ==================== REQUEST EVENT CONFIGURATION ====================
        builder.Entity<RequestEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(100);

            entity.HasOne(e => e.Request)
                .WithMany(r => r.Events)
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Performer)
                .WithMany()
                .HasForeignKey(e => e.PerformedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.RequestId, e.PerformedAt });
            entity.HasIndex(e => e.EventType);
        });

        // ==================== REQUEST ACTIVE STEP CONFIGURATION ====================
        builder.Entity<RequestActiveStep>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StepKey).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);

            entity.HasOne(e => e.Request)
                .WithMany(r => r.ActiveSteps)
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.RequestId, e.Status });
        });

        // ==================== NOTIFICATION CONFIGURATION ====================
        builder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Message).IsRequired();
            entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Link).HasMaxLength(500);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.IsRead, e.Created });
        });

        // ==================== NOTIFICATION PREFERENCE CONFIGURATION ====================
        builder.Entity<NotificationPreference>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ==================== STEP FIELD PERMISSION CONFIGURATION ====================
        builder.Entity<StepFieldPermission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FieldKey).IsRequired().HasMaxLength(100);
            entity.Property(e => e.RoleType).HasMaxLength(50);

            entity.HasOne(e => e.Step)
                .WithMany(s => s.FieldPermissions)
                .HasForeignKey(e => e.StepId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.StepId, e.FieldKey });
        });

        base.OnModelCreating(builder);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.AddInterceptors(_auditableEntityInterceptor);
    }
}
