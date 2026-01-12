namespace HelpDesk.Application.Common.Interfaces;

/// <summary>
/// Service for calculating SLA due dates and checking violations
/// </summary>
public interface ISlaCalculator
{
    /// <summary>
    /// Calculate SLA due date from a start time and SLA hours
    /// </summary>
    DateTime CalculateDueDate(DateTime startTime, int slaHours, bool useBusinessHours = true);

    /// <summary>
    /// Check if a request is overdue
    /// </summary>
    bool IsOverdue(DateTime? dueDate);

    /// <summary>
    /// Get time remaining until SLA breach
    /// </summary>
    TimeSpan GetTimeRemaining(DateTime? dueDate);

    /// <summary>
    /// Get hours remaining until SLA breach
    /// </summary>
    double GetHoursRemaining(DateTime? dueDate);

    /// <summary>
    /// Check if date/time is within business hours
    /// </summary>
    bool IsBusinessHours(DateTime dateTime);

    /// <summary>
    /// Get next business hour start time
    /// </summary>
    DateTime GetNextBusinessHourStart(DateTime fromTime);

    /// <summary>
    /// Get business hours configuration
    /// </summary>
    BusinessHoursConfig GetBusinessHoursConfig();
}

/// <summary>
/// Business hours configuration
/// </summary>
public class BusinessHoursConfig
{
    public TimeOnly StartTime { get; set; } = new TimeOnly(9, 0); // 9 AM
    public TimeOnly EndTime { get; set; } = new TimeOnly(17, 0);  // 5 PM
    public List<DayOfWeek> WorkingDays { get; set; } = new()
    {
        DayOfWeek.Sunday,
        DayOfWeek.Monday,
        DayOfWeek.Tuesday,
        DayOfWeek.Wednesday,
        DayOfWeek.Thursday
    };
    public List<DateTime> Holidays { get; set; } = new();
}
