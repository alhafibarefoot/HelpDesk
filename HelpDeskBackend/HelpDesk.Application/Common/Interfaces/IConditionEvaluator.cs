using System.Text.Json;

namespace HelpDesk.Application.Common.Interfaces;

/// <summary>
/// Service for evaluating workflow conditions
/// </summary>
public interface IConditionEvaluator
{
    /// <summary>
    /// Evaluate a condition against request data
    /// </summary>
    Task<bool> EvaluateAsync(string? conditionJson, Dictionary<string, object> requestData, CancellationToken cancellationToken = default);

    /// <summary>
    /// Evaluate a simple condition (single field check)
    /// </summary>
    bool EvaluateSimple(string fieldKey, string operatorType, object expectedValue, Dictionary<string, object> requestData);

    /// <summary>
    /// Evaluate a complex condition (AND/OR logic)
    /// </summary>
    bool EvaluateComplex(ConditionGroup conditionGroup, Dictionary<string, object> requestData);
}

/// <summary>
/// Condition group for complex AND/OR logic
/// </summary>
public class ConditionGroup
{
    public string Logic { get; set; } = "AND"; // "AND" or "OR"
    public List<Condition> Conditions { get; set; } = new();
    public List<ConditionGroup>? SubGroups { get; set; }
}

/// <summary>
/// Single condition
/// </summary>
public class Condition
{
    public string FieldKey { get; set; } = string.Empty;
    public string Operator { get; set; } = "eq"; // eq, neq, gt, lt, gte, lte, contains, startsWith, endsWith
    public object? ExpectedValue { get; set; }
}

/// <summary>
/// Supported operators
/// </summary>
public static class ConditionOperators
{
    public const string Equal = "eq";
    public const string NotEqual = "neq";
    public const string GreaterThan = "gt";
    public const string LessThan = "lt";
    public const string GreaterThanOrEqual = "gte";
    public const string LessThanOrEqual = "lte";
    public const string Contains = "contains";
    public const string StartsWith = "startsWith";
    public const string EndsWith = "endsWith";
    public const string In = "in";
    public const string NotIn = "notIn";
}
