namespace HelpDesk.Domain.Enums;

/// <summary>
/// User role in the system
/// </summary>
public enum UserRole
{
    Employee,       // موظف
    Approver,       // معتمد
    ServiceOwner,   // مسؤول خدمة
    Admin           // مشرف
}

/// <summary>
/// Service/Request status
/// </summary>
public enum ServiceStatus
{
    New,            // جديد
    UnderReview,    // قيد المراجعة
    InProgress,     // قيد التنفيذ
    OnHold,         // موقوف
    Completed,      // مكتمل
    Rejected,       // مرفوض
    Cancelled,      // ملغي
    Overdue         // متأخر
}

/// <summary>
/// Service lifecycle status
/// </summary>
public enum ServiceLifecycleStatus
{
    Draft,          // مسودة
    Active,         // نشط
    Suspended,      // معلق
    Maintenance     // صيانة
}

/// <summary>
/// Request priority levels
/// </summary>
public enum RequestPriority
{
    Low,            // منخفض
    Medium,         // متوسط
    High,           // مرتفع
    Urgent          // عاجل
}

/// <summary>
/// Workflow step types
/// </summary>
public enum StepType
{
    Approval,       // اعتماد
    Execution,      // تنفيذ
    Notification,   // إشعار
    ParallelFork,   // تفريع متوازي - Split into multiple parallel paths
    ParallelJoin,   // دمج متوازي - Merge parallel paths back
    Gateway,        // بوابة - Conditional branching (AND/OR logic)
    SubWorkflow,    // سير عمل فرعي - Trigger nested workflow
    Action          // إجراء - Automated action
}

/// <summary>
/// Request action types for audit trail
/// </summary>
public enum ActionType
{
    Create,         // إنشاء
    Submit,         // إرسال
    Approve,        // اعتماد
    Reject,         // رفض
    Execute,        // تنفيذ
    Update,         // تحديث
    Close,          // إغلاق
    Cancel          // إلغاء
}

/// <summary>
/// Notification types
/// </summary>
public enum NotificationType
{
    Info,
    Success,
    Warning,
    Error,
    RequestAssigned,
    RequestApproved,
    RequestRejected,
    CommentAdded,
    SlaWarning,
    Escalation
}

/// <summary>
/// Active step status
/// </summary>
public enum ActiveStepStatus
{
    Active,
    Completed
}
