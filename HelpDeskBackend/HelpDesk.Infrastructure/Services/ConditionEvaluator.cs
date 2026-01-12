using HelpDesk.Application.Common.Interfaces;
using System.Text.Json;

namespace HelpDesk.Infrastructure.Services;

/// <summary>
/// Condition evaluator implementation
/// </summary>
public class ConditionEvaluator : IConditionEvaluator
{
    public async Task<bool> EvaluateAsync(string? conditionJson, Dictionary<string, object> requestData, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(conditionJson))
        {
            return true; // No condition means always pass
        }

        try
        {
            var conditionGroup = JsonSerializer.Deserialize<ConditionGroup>(conditionJson);
            if (conditionGroup == null)
            {
                return true;
            }

            return await Task.FromResult(EvaluateComplex(conditionGroup, requestData));
        }
        catch
        {
            // If JSON parsing fails, try as simple condition
            try
            {
                var condition = JsonSerializer.Deserialize<Condition>(conditionJson);
                if (condition != null)
                {
                    return EvaluateSimple(condition.FieldKey, condition.Operator, condition.ExpectedValue ?? string.Empty, requestData);
                }
            }
            catch
            {
                // Invalid condition - default to true
                return true;
            }
        }

        return true;
    }

    public bool EvaluateSimple(string fieldKey, string operatorType, object expectedValue, Dictionary<string, object> requestData)
    {
        if (!requestData.TryGetValue(fieldKey, out var actualValue))
        {
            return false; // Field not found
        }

        return operatorType switch
        {
            ConditionOperators.Equal => CompareValues(actualValue, expectedValue, (a, b) => a.Equals(b)),
            ConditionOperators.NotEqual => CompareValues(actualValue, expectedValue, (a, b) => !a.Equals(b)),
            ConditionOperators.GreaterThan => CompareNumeric(actualValue, expectedValue, (a, b) => a > b),
            ConditionOperators.LessThan => CompareNumeric(actualValue, expectedValue, (a, b) => a < b),
            ConditionOperators.GreaterThanOrEqual => CompareNumeric(actualValue, expectedValue, (a, b) => a >= b),
            ConditionOperators.LessThanOrEqual => CompareNumeric(actualValue, expectedValue, (a, b) => a <= b),
            ConditionOperators.Contains => actualValue.ToString()?.Contains(expectedValue.ToString() ?? "") ?? false,
            ConditionOperators.StartsWith => actualValue.ToString()?.StartsWith(expectedValue.ToString() ?? "") ?? false,
            ConditionOperators.EndsWith => actualValue.ToString()?.EndsWith(expectedValue.ToString() ?? "") ?? false,
            ConditionOperators.In => CheckInArray(actualValue, expectedValue),
            ConditionOperators.NotIn => !CheckInArray(actualValue, expectedValue),
            _ => false
        };
    }

    public bool EvaluateComplex(ConditionGroup conditionGroup, Dictionary<string, object> requestData)
    {
        var results = new List<bool>();

        // Evaluate all conditions in this group
        foreach (var condition in conditionGroup.Conditions)
        {
            var result = EvaluateSimple(condition.FieldKey, condition.Operator, condition.ExpectedValue ?? string.Empty, requestData);
            results.Add(result);
        }

        // Evaluate sub-groups
        if (conditionGroup.SubGroups != null)
        {
            foreach (var subGroup in conditionGroup.SubGroups)
            {
                var result = EvaluateComplex(subGroup, requestData);
                results.Add(result);
            }
        }

        // Apply logic (AND/OR)
        if (conditionGroup.Logic.Equals("OR", StringComparison.OrdinalIgnoreCase))
        {
            return results.Any(r => r);
        }
        else // Default to AND
        {
            return results.All(r => r);
        }
    }

    private bool CompareValues(object actual, object expected, Func<string, string, bool> comparer)
    {
        var actualStr = actual?.ToString() ?? "";
        var expectedStr = expected?.ToString() ?? "";
        return comparer(actualStr, expectedStr);
    }

    private bool CompareNumeric(object actual, object expected, Func<double, double, bool> comparer)
    {
        if (double.TryParse(actual?.ToString(), out var actualNum) &&
            double.TryParse(expected?.ToString(), out var expectedNum))
        {
            return comparer(actualNum, expectedNum);
        }
        return false;
    }

    private bool CheckInArray(object actual, object expected)
    {
        try
        {
            var actualStr = actual?.ToString() ?? "";

            // Try to parse expected as JSON array
            if (expected is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
            {
                var array = jsonElement.EnumerateArray().Select(e => e.ToString()).ToList();
                return array.Contains(actualStr);
            }

            // Try as string array
            if (expected is string expectedStr)
            {
                var array = JsonSerializer.Deserialize<string[]>(expectedStr);
                return array?.Contains(actualStr) ?? false;
            }

            return false;
        }
        catch
        {
            return false;
        }
    }
}
