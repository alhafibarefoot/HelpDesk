using HelpDesk.Application.Common.Interfaces;

namespace HelpDesk.Infrastructure.Services;

/// <summary>
/// SLA calculator implementation with business hours support
/// </summary>
public class SlaCalculator : ISlaCalculator
{
    private readonly BusinessHoursConfig _config;

    public SlaCalculator()
    {
        _config = new BusinessHoursConfig();
    }

    public DateTime CalculateDueDate(DateTime startTime, int slaHours, bool useBusinessHours = true)
    {
        if (!useBusinessHours)
        {
            return startTime.AddHours(slaHours);
        }

        var dueDate = startTime;
        var hoursRemaining = slaHours;

        while (hoursRemaining > 0)
        {
            // Skip to next business hour if current time is outside business hours
            if (!IsBusinessHours(dueDate))
            {
                dueDate = GetNextBusinessHourStart(dueDate);
            }

            // Calculate hours until end of business day
            var endOfBusinessDay = dueDate.Date.Add(_config.EndTime.ToTimeSpan());
            var hoursUntilEndOfDay = (endOfBusinessDay - dueDate).TotalHours;

            if (hoursRemaining <= hoursUntilEndOfDay)
            {
                // Can complete within this business day
                dueDate = dueDate.AddHours(hoursRemaining);
                hoursRemaining = 0;
            }
            else
            {
                // Need to continue to next business day
                hoursRemaining -= (int)hoursUntilEndOfDay;
                dueDate = GetNextBusinessHourStart(endOfBusinessDay);
            }
        }

        return dueDate;
    }

    public bool IsOverdue(DateTime? dueDate)
    {
        if (!dueDate.HasValue) return false;
        return DateTime.Now > dueDate.Value;
    }

    public TimeSpan GetTimeRemaining(DateTime? dueDate)
    {
        if (!dueDate.HasValue) return TimeSpan.Zero;
        var remaining = dueDate.Value - DateTime.Now;
        return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
    }

    public double GetHoursRemaining(DateTime? dueDate)
    {
        return GetTimeRemaining(dueDate).TotalHours;
    }

    public bool IsBusinessHours(DateTime dateTime)
    {
        // Check if it's a working day
        if (!_config.WorkingDays.Contains(dateTime.DayOfWeek))
        {
            return false;
        }

        // Check if it's a holiday
        if (_config.Holidays.Any(h => h.Date == dateTime.Date))
        {
            return false;
        }

        // Check if time is within business hours
        var time = TimeOnly.FromDateTime(dateTime);
        return time >= _config.StartTime && time < _config.EndTime;
    }

    public DateTime GetNextBusinessHourStart(DateTime fromTime)
    {
        var nextTime = fromTime;

        // If we're in the middle of a business day but after hours, move to next day
        var currentTime = TimeOnly.FromDateTime(nextTime);
        if (currentTime >= _config.EndTime)
        {
            nextTime = nextTime.Date.AddDays(1).Add(_config.StartTime.ToTimeSpan());
        }
        else if (currentTime < _config.StartTime)
        {
            nextTime = nextTime.Date.Add(_config.StartTime.ToTimeSpan());
        }

        // Skip weekends and holidays
        while (!IsBusinessHours(nextTime))
        {
            nextTime = nextTime.Date.AddDays(1).Add(_config.StartTime.ToTimeSpan());
        }

        return nextTime;
    }

    public BusinessHoursConfig GetBusinessHoursConfig()
    {
        return _config;
    }
}
