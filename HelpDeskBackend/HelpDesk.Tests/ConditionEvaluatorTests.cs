using FluentAssertions;
using HelpDesk.Application.Common.Interfaces;
using Xunit;

namespace HelpDesk.Tests;

public class ConditionEvaluatorTests
{
    private readonly IConditionEvaluator _evaluator;

    public ConditionEvaluatorTests()
    {
        _evaluator = new Infrastructure.Services.ConditionEvaluator();
    }

    [Fact]
    public void EvaluateSimple_EqualOperator_ShouldReturnTrue_WhenValuesMatch()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "department", "IT" }
        };

        // Act
        var result = _evaluator.EvaluateSimple("department", "eq", "IT", requestData);

        // Assert
        result.Should().BeTrue("IT equals IT");
    }

    [Fact]
    public void EvaluateSimple_EqualOperator_ShouldReturnFalse_WhenValuesDontMatch()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "department", "HR" }
        };

        // Act
        var result = _evaluator.EvaluateSimple("department", "eq", "IT", requestData);

        // Assert
        result.Should().BeFalse("HR does not equal IT");
    }

    [Fact]
    public void EvaluateSimple_GreaterThanOperator_ShouldReturnTrue_WhenNumberIsBigger()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "amount", 1500 }
        };

        // Act
        var result = _evaluator.EvaluateSimple("amount", "gt", 1000, requestData);

        // Assert
        result.Should().BeTrue("1500 is greater than 1000");
    }

    [Fact]
    public void EvaluateSimple_LessThanOperator_ShouldReturnTrue_WhenNumberIsSmaller()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "amount", 500 }
        };

        // Act
        var result = _evaluator.EvaluateSimple("amount", "lt", 1000, requestData);

        // Assert
        result.Should().BeTrue("500 is less than 1000");
    }

    [Fact]
    public void EvaluateSimple_ContainsOperator_ShouldReturnTrue_WhenStringContainsValue()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "description", "This is urgent request" }
        };

        // Act
        var result = _evaluator.EvaluateSimple("description", "contains", "urgent", requestData);

        // Assert
        result.Should().BeTrue("description contains 'urgent'");
    }

    [Fact]
    public void EvaluateSimple_StartsWithOperator_ShouldReturnTrue_WhenStringStartsWithValue()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "title", "Request for laptop" }
        };

        // Act
        var result = _evaluator.EvaluateSimple("title", "startsWith", "Request", requestData);

        // Assert
        result.Should().BeTrue("title starts with 'Request'");
    }

    [Fact]
    public void EvaluateSimple_ShouldReturnFalse_WhenFieldNotFound()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "department", "IT" }
        };

        // Act
        var result = _evaluator.EvaluateSimple("nonexistent", "eq", "value", requestData);

        // Assert
        result.Should().BeFalse("field does not exist in request data");
    }

    [Fact]
    public void EvaluateComplex_ANDLogic_ShouldReturnTrue_WhenAllConditionsMatch()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "department", "Finance" },
            { "amount", 5000 }
        };

        var conditionGroup = new ConditionGroup
        {
            Logic = "AND",
            Conditions = new List<Condition>
            {
                new Condition { FieldKey = "department", Operator = "eq", ExpectedValue = "Finance" },
                new Condition { FieldKey = "amount", Operator = "gte", ExpectedValue = 1000 }
            }
        };

        // Act
        var result = _evaluator.EvaluateComplex(conditionGroup, requestData);

        // Assert
        result.Should().BeTrue("both conditions match with AND logic");
    }

    [Fact]
    public void EvaluateComplex_ANDLogic_ShouldReturnFalse_WhenOneConditionFails()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "department", "IT" },
            { "amount", 500 }
        };

        var conditionGroup = new ConditionGroup
        {
            Logic = "AND",
            Conditions = new List<Condition>
            {
                new Condition { FieldKey = "department", Operator = "eq", ExpectedValue = "Finance" },
                new Condition { FieldKey = "amount", Operator = "gte", ExpectedValue = 1000 }
            }
        };

        // Act
        var result = _evaluator.EvaluateComplex(conditionGroup, requestData);

        // Assert
        result.Should().BeFalse("not all conditions match with AND logic");
    }

    [Fact]
    public void EvaluateComplex_ORLogic_ShouldReturnTrue_WhenAtLeastOneConditionMatches()
    {
        // Arrange
        var requestData = new Dictionary<string, object>
        {
            { "department", "IT" },
            { "amount", 5000 }
        };

        var conditionGroup = new ConditionGroup
        {
            Logic = "OR",
            Conditions = new List<Condition>
            {
                new Condition { FieldKey = "department", Operator = "eq", ExpectedValue = "Finance" },
                new Condition { FieldKey = "amount", Operator = "gte", ExpectedValue = 1000 }
            }
        };

        // Act
        var result = _evaluator.EvaluateComplex(conditionGroup, requestData);

        // Assert
        result.Should().BeTrue("at least one condition matches with OR logic");
    }
}
