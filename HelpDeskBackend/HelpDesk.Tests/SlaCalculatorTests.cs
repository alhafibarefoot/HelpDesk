using FluentAssertions;
using HelpDesk.Application.Common.Interfaces;
using Xunit;

namespace HelpDesk.Tests;

public class SlaCalculatorTests
{
    private readonly ISlaCalculator _slaCalculator;

    public SlaCalculatorTests()
    {
        _slaCalculator = new Infrastructure.Services.SlaCalculator();
    }

    [Fact]
    public void IsBusinessHours_ShouldReturnTrue_ForSundayAt10AM()
    {
        // Arrange
        var dateTime = new DateTime(2025, 1, 5, 10, 0, 0); // Sunday 10 AM

        // Act
        var result = _slaCalculator.IsBusinessHours(dateTime);

        // Assert
        result.Should().BeTrue("Sunday 10 AM is within business hours (9 AM - 5 PM)");
    }

    [Fact]
    public void IsBusinessHours_ShouldReturnFalse_ForFridayAt10AM()
    {
        // Arrange
        var dateTime = new DateTime(2025, 1, 3, 10, 0, 0); // Friday 10 AM (weekend)

        // Act
        var result = _slaCalculator.IsBusinessHours(dateTime);

        // Assert
        result.Should().BeFalse("Friday is a weekend in Saudi Arabia");
    }

    [Fact]
    public void IsBusinessHours_ShouldReturnFalse_ForSaturdayAt10AM()
    {
        // Arrange
        var dateTime = new DateTime(2025, 1, 4, 10, 0, 0); // Saturday 10 AM (weekend)

        // Act
        var result = _slaCalculator.IsBusinessHours(dateTime);

        // Assert
        result.Should().BeFalse("Saturday is a weekend in Saudi Arabia");
    }

    [Fact]
    public void IsBusinessHours_ShouldReturnFalse_BeforeBusinessHours()
    {
        // Arrange
        var dateTime = new DateTime(2025, 1, 5, 8, 0, 0); // Sunday 8 AM (before 9 AM)

        // Act
        var result = _slaCalculator.IsBusinessHours(dateTime);

        // Assert
        result.Should().BeFalse("8 AM is before business hours start (9 AM)");
    }

    [Fact]
    public void IsBusinessHours_ShouldReturnFalse_AfterBusinessHours()
    {
        // Arrange
        var dateTime = new DateTime(2025, 1, 5, 17, 0, 0); // Sunday 5 PM (end of business hours)

        // Act
        var result = _slaCalculator.IsBusinessHours(dateTime);

        // Assert
        result.Should().BeFalse("5 PM is not within business hours (9 AM - 5 PM exclusive)");
    }

    [Fact]
    public void CalculateDueDate_WithoutBusinessHours_ShouldAddHoursDirectly()
    {
        // Arrange
        var startTime = new DateTime(2025, 1, 5, 10, 0, 0); // Sunday 10 AM
        var slaHours = 24;

        // Act
        var result = _slaCalculator.CalculateDueDate(startTime, slaHours, useBusinessHours: false);

        // Assert
        result.Should().Be(startTime.AddHours(24), "without business hours, should add 24 hours directly");
    }

    [Fact]
    public void IsOverdue_ShouldReturnTrue_WhenDueDateIsInPast()
    {
        // Arrange
        var dueDate = DateTime.Now.AddHours(-1);

        // Act
        var result = _slaCalculator.IsOverdue(dueDate);

        // Assert
        result.Should().BeTrue("due date is in the past");
    }

    [Fact]
    public void IsOverdue_ShouldReturnFalse_WhenDueDateIsInFuture()
    {
        // Arrange
        var dueDate = DateTime.Now.AddHours(1);

        // Act
        var result = _slaCalculator.IsOverdue(dueDate);

        // Assert
        result.Should().BeFalse("due date is in the future");
    }

    [Fact]
    public void GetHoursRemaining_ShouldReturnCorrectValue()
    {
        // Arrange
        var dueDate = DateTime.Now.AddHours(5);

        // Act
        var result = _slaCalculator.GetHoursRemaining(dueDate);

        // Assert
        result.Should().BeApproximately(5, 0.1, "5 hours remaining until due date");
    }

    [Fact]
    public void GetHoursRemaining_ShouldReturnZero_WhenOverdue()
    {
        // Arrange
        var dueDate = DateTime.Now.AddHours(-2);

        // Act
        var result = _slaCalculator.GetHoursRemaining(dueDate);

        // Assert
        result.Should().Be(0, "overdue dates should return 0 hours remaining");
    }
}
