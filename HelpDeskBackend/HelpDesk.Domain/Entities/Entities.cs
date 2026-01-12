using HelpDesk.Domain.Common;
using HelpDesk.Domain.Enums;
using System.Collections.Generic;

namespace HelpDesk.Domain.Entities;

// ==================== USER ====================
public class User : AuditableEntity
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Employee;
    public string Department { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? EmployeeId { get; set; }
    public string? HrManagerId { get; set; }
    public int? DirectManagerId { get; set; }
    public User? DirectManager { get; set; }
    public string? HrData { get; set; } // JSON serialized data from HR system

    // Navigation properties
    public ICollection<Request> Requests { get; set; } = new List<Request>();
    public ICollection<RequestAction> RequestActions { get; set; } = new List<RequestAction>();
    public ICollection<RequestComment> RequestComments { get; set; } = new List<RequestComment>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

// ==================== SERVICE ====================
public class Service : AuditableEntity
{
    public string ServiceKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = "Briefcase";
    public string OwningDepartment { get; set; } = string.Empty;
    public int DefaultSlaHours { get; set; } = 24;
    public bool IsActive { get; set; } = true;
    public ServiceLifecycleStatus Status { get; set; } = ServiceLifecycleStatus.Active;
    public string FormSchema { get; set; } = "{}"; // JSON

    // Navigation properties
    public Workflow? Workflow { get; set; }
    public ICollection<Request> Requests { get; set; } = new List<Request>();
}

// ==================== WORKFLOW ====================
public class Workflow : AuditableEntity
{
    public int ServiceId { get; set; }
    public Service Service { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string Definition { get; set; } = "{}"; // JSON: WorkflowDefinition with nodes/edges

    // Navigation properties
    public ICollection<WorkflowStep> Steps { get; set; } = new List<WorkflowStep>();
}

// ==================== WORKFLOW STEP ====================
public class WorkflowStep : AuditableEntity
{
    public int WorkflowId { get; set; }
    public Workflow Workflow { get; set; } = null!;
    public int StepOrder { get; set; }
    public string Name { get; set; } = string.Empty;
    public StepType StepType { get; set; }
    public string? AssignedRole { get; set; }
    public string? AssignedDepartment { get; set; }
    public bool RequiresAllApprovers { get; set; } = true;
    public string? Condition { get; set; } // JSON: Condition object
    public int? SlaHours { get; set; }

    // Navigation properties
    public ICollection<StepFieldPermission> FieldPermissions { get; set; } = new List<StepFieldPermission>();
}

// ==================== REQUEST ====================
public class Request : AuditableEntity
{
    public string RequestNumber { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public Service Service { get; set; } = null!;
    public int RequesterId { get; set; }
    public User Requester { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ServiceStatus Status { get; set; } = ServiceStatus.New;
    public RequestPriority Priority { get; set; } = RequestPriority.Medium;
    public string? Department { get; set; }
    public int? CurrentStepId { get; set; }
    public string CurrentStepKey { get; set; } = "start";
    public DateTime? SlaDeAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? FormSchemaSnapshot { get; set; } // JSON: Form schema at time of request

    // Navigation properties
    public RequestFormValue? FormValue { get; set; }
    public ICollection<RequestAction> Actions { get; set; } = new List<RequestAction>();
    public ICollection<RequestComment> Comments { get; set; } = new List<RequestComment>();
    public ICollection<RequestAttachment> Attachments { get; set; } = new List<RequestAttachment>();
    public ICollection<RequestEvent> Events { get; set; } = new List<RequestEvent>();
    public ICollection<RequestActiveStep> ActiveSteps { get; set; } = new List<RequestActiveStep>();
}

// ==================== REQUEST FORM VALUE ====================
public class RequestFormValue : AuditableEntity
{
    public int RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public string FormData { get; set; } = "{}"; // JSON
}

// ==================== REQUEST ACTION ====================
public class RequestAction : AuditableEntity
{
    public int RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public int? ActorId { get; set; }
    public User? Actor { get; set; }
    public ActionType ActionType { get; set; }
    public int? FromStepId { get; set; }
    public int? ToStepId { get; set; }
    public string? FromStepKey { get; set; }
    public string? ToStepKey { get; set; }
    public string? Comment { get; set; }
}

// ==================== REQUEST COMMENT ====================
public class RequestComment : AuditableEntity
{
    public int RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public string? Mentions { get; set; } // JSON: Array of user IDs
    public bool IsInternal { get; set; } = false;
}

// ==================== REQUEST ATTACHMENT ====================
public class RequestAttachment : AuditableEntity
{
    public int RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public int UploadedBy { get; set; }
    public User Uploader { get; set; } = null!;
}

// ==================== REQUEST EVENT ====================
public class RequestEvent : AuditableEntity
{
    public int RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public int? StepId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int? PerformedBy { get; set; }
    public User? Performer { get; set; }
    public DateTime PerformedAt { get; set; }
    public string Payload { get; set; } = "{}"; // JSON
    public string? Meta { get; set; } // JSON
}

// ==================== REQUEST ACTIVE STEP ====================
public class RequestActiveStep : AuditableEntity
{
    public int RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public int StepId { get; set; }
    public string StepKey { get; set; } = string.Empty;
    public ActiveStepStatus Status { get; set; } = ActiveStepStatus.Active;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

// ==================== NOTIFICATION ====================
public class Notification : AuditableEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.Info;
    public bool IsRead { get; set; } = false;
    public string? Link { get; set; }
}

// ==================== NOTIFICATION PREFERENCE ====================
public class NotificationPreference : AuditableEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Preferences { get; set; } = "{}"; // JSON
}

// ==================== STEP FIELD PERMISSION ====================
public class StepFieldPermission : AuditableEntity
{
    public int StepId { get; set; }
    public WorkflowStep Step { get; set; } = null!;
    public string FieldKey { get; set; } = string.Empty;
    public bool Visible { get; set; } = true;
    public bool Editable { get; set; } = true;
    public bool? RequiredOverride { get; set; }
    public string? AllowedRoles { get; set; } // JSON: Array of UserRole
    public string RoleType { get; set; } = "others"; // assignee, requester, others
}
