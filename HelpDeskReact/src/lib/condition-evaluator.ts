import { Condition, SimpleCondition, ComplexCondition } from "@/types";

/**
 * Check if a condition is a simple condition
 */
function isSimpleCondition(condition: Condition): condition is SimpleCondition {
    return 'field' in condition && 'operator' in condition;
}

/**
 * Check if a condition is a complex condition
 */
function isComplexCondition(condition: Condition): condition is ComplexCondition {
    return 'type' in condition && 'conditions' in condition;
}

/**
 * Evaluate a simple condition
 */
function evaluateSimpleCondition(
    condition: SimpleCondition,
    context: Record<string, any>
): boolean {
    const { field, operator, value } = condition;
    const actualValue = context[field];

    switch (operator) {
        case 'eq':
            return actualValue == value;
        case 'neq':
            return actualValue != value;
        case 'gt':
            return Number(actualValue) > Number(value);
        case 'lt':
            return Number(actualValue) < Number(value);
        case 'gte':
            return Number(actualValue) >= Number(value);
        case 'lte':
            return Number(actualValue) <= Number(value);
        case 'contains':
            return String(actualValue).includes(String(value));
        case 'startsWith':
            return String(actualValue).startsWith(String(value));
        case 'endsWith':
            return String(actualValue).endsWith(String(value));
        default:
            return false;
    }
}

/**
 * Evaluate a complex condition (AND/OR logic)
 */
function evaluateComplexCondition(
    condition: ComplexCondition,
    context: Record<string, any>
): boolean {
    const { type, conditions } = condition;

    if (type === 'and') {
        // All conditions must be true
        return conditions.every(cond => evaluateCondition(cond, context));
    } else if (type === 'or') {
        // At least one condition must be true
        return conditions.some(cond => evaluateCondition(cond, context));
    }

    return false;
}

/**
 * Main condition evaluator - handles both simple and complex conditions
 */
// Helper to parse string conditions like "amount > 500"
function parseConditionString(condition: string): SimpleCondition | null {
    try {
        // 1. Simple boolean/truthy check
        if (!condition.includes(' ') && !condition.includes('>') && !condition.includes('<') && !condition.includes('=')) {
            // Treating as boolean check on field
            return { field: condition, operator: 'eq', value: true }; // Rough approximation
        }

        // 2. Comparison "field op value"
        const parts = condition.split(/(\s+)/).filter(e => e.trim().length > 0);
        if (parts.length === 3) {
            const field = parts[0];
            const operatorSymbol = parts[1];
            let value: any = parts[2];

            // Unquote
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            } else if (!isNaN(Number(value))) {
                value = Number(value);
            } else if (value === 'true') value = true;
            else if (value === 'false') value = false;

            let operator: SimpleCondition['operator'] = 'eq';
            switch (operatorSymbol) {
                case '==': operator = 'eq'; break;
                case '!=': operator = 'neq'; break;
                case '>': operator = 'gt'; break;
                case '<': operator = 'lt'; break;
                case '>=': operator = 'gte'; break;
                case '<=': operator = 'lte'; break;
                default: return null;
            }

            return { field, operator, value };
        }
    } catch (e) {
        return null;
    }
    return null;
}

/**
 * Main condition evaluator - handles both simple and complex conditions
 */
export function evaluateCondition(
    condition: Condition | string,
    context: Record<string, any>
): boolean {
    if (typeof condition === 'string') {
        const parsed = parseConditionString(condition);
        if (parsed) return evaluateSimpleCondition(parsed, context);
        // Fallback: If it's a simple boolean field check done in existing logic
        // "field" -> check if context[field] is truthy
        if (!condition.includes(' ')) {
            return !!context[condition];
        }
        return false;
    }

    if (isSimpleCondition(condition)) {
        return evaluateSimpleCondition(condition, context);
    } else if (isComplexCondition(condition)) {
        return evaluateComplexCondition(condition, context);
    }

    return false;
}

/**
 * Example usage:
 * 
 * // Simple condition
 * const simple: SimpleCondition = {
 *   field: 'amount',
 *   operator: 'gt',
 *   value: 1000
 * };
 * 
 * // Complex condition (AND)
 * const complex: ComplexCondition = {
 *   type: 'and',
 *   conditions: [
 *     { field: 'amount', operator: 'gt', value: 1000 },
 *     { field: 'department', operator: 'eq', value: 'IT' }
 *   ]
 * };
 * 
 * // Nested complex condition (OR of ANDs)
 * const nested: ComplexCondition = {
 *   type: 'or',
 *   conditions: [
 *     {
 *       type: 'and',
 *       conditions: [
 *         { field: 'amount', operator: 'gt', value: 5000 },
 *         { field: 'department', operator: 'eq', value: 'Finance' }
 *       ]
 *     },
 *     {
 *       type: 'and',
 *       conditions: [
 *         { field: 'priority', operator: 'eq', value: 'urgent' },
 *         { field: 'requester_role', operator: 'eq', value: 'manager' }
 *       ]
 *     }
 *   ]
 * };
 */
