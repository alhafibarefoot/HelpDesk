/**
 * Workflow Analytics Service
 * Calculates statistics and insights about workflows
 */

import { Node, Edge } from 'reactflow';

export interface WorkflowStats {
    // Step counts
    totalSteps: number;
    approvalSteps: number;
    actionSteps: number;
    formSteps: number;
    gatewaySteps: number;
    subworkflowSteps: number;
    endStates: number;

    // Complexity
    complexityScore: number;
    complexityLevel: 'simple' | 'medium' | 'complex' | 'very_complex';

    // Paths
    totalPaths: number;
    parallelPaths: number;

    // SLA
    averageSLA: number;
    totalSLA: number;
    stepsWithSLA: number;

    // Integrations
    hasSubworkflows: boolean;
    hasGateways: boolean;
    hasConditionalPaths: boolean;
}

/**
 * Calculate comprehensive workflow statistics
 */
export function calculateWorkflowStats(nodes: Node[], edges: Edge[]): WorkflowStats {
    // Count node types
    const approvalSteps = nodes.filter(n => n.type === 'approval').length;
    const actionSteps = nodes.filter(n => n.type === 'action').length;
    const formSteps = nodes.filter(n => n.type === 'form').length;
    const gatewaySteps = nodes.filter(n => n.type === 'gateway').length;
    const subworkflowSteps = nodes.filter(n => n.type === 'subworkflow').length;
    const endStates = nodes.filter(n => n.type === 'end').length;

    const totalSteps = nodes.length;

    // Calculate complexity score
    const complexityWeights = {
        approval: 2,
        action: 1,
        form: 1,
        gateway: 3,
        join: 2,
        subworkflow: 4,
        start: 0,
        end: 0
    };

    const complexityScore = nodes.reduce((score, node) => {
        const weight = complexityWeights[node.type as keyof typeof complexityWeights] || 1;
        return score + weight;
    }, 0);

    // Determine complexity level
    let complexityLevel: 'simple' | 'medium' | 'complex' | 'very_complex';
    if (complexityScore <= 5) complexityLevel = 'simple';
    else if (complexityScore <= 15) complexityLevel = 'medium';
    else if (complexityScore <= 30) complexityLevel = 'complex';
    else complexityLevel = 'very_complex';

    // Calculate paths
    const totalPaths = edges.length;
    const parallelPaths = gatewaySteps; // Simplified

    // Calculate SLA statistics
    const nodesWithSLA = nodes.filter(n => n.data?.sla_hours);
    const stepsWithSLA = nodesWithSLA.length;
    const totalSLA = nodesWithSLA.reduce((sum, n) => sum + (n.data?.sla_hours || 0), 0);
    const averageSLA = stepsWithSLA > 0 ? totalSLA / stepsWithSLA : 0;

    // Check for integrations
    const hasSubworkflows = subworkflowSteps > 0;
    const hasGateways = gatewaySteps > 0;
    const hasConditionalPaths = edges.some(e => e.data?.condition);

    return {
        totalSteps,
        approvalSteps,
        actionSteps,
        formSteps,
        gatewaySteps,
        subworkflowSteps,
        endStates,
        complexityScore,
        complexityLevel,
        totalPaths,
        parallelPaths,
        averageSLA,
        totalSLA,
        stepsWithSLA,
        hasSubworkflows,
        hasGateways,
        hasConditionalPaths
    };
}

/**
 * Get complexity level emoji and color
 */
export function getComplexityDisplay(level: string) {
    const displays = {
        simple: { emoji: '⭐', label: 'بسيط', color: 'text-green-600', bg: 'bg-green-50' },
        medium: { emoji: '⭐⭐', label: 'متوسط', color: 'text-yellow-600', bg: 'bg-yellow-50' },
        complex: { emoji: '⭐⭐⭐', label: 'معقد', color: 'text-orange-600', bg: 'bg-orange-50' },
        very_complex: { emoji: '⭐⭐⭐⭐', label: 'معقد جداً', color: 'text-red-600', bg: 'bg-red-50' }
    };

    return displays[level as keyof typeof displays] || displays.simple;
}

/**
 * Get integration icons
 */
export function getIntegrationsList(stats: WorkflowStats): string[] {
    const integrations: string[] = [];

    if (stats.hasSubworkflows) integrations.push('🔗 سير عمل فرعي');
    if (stats.hasGateways) integrations.push('🔀 مسارات متوازية');
    if (stats.hasConditionalPaths) integrations.push('⚡ شروط ديناميكية');
    if (stats.formSteps > 0) integrations.push('📝 نماذج إدخال');

    if (integrations.length === 0) {
        integrations.push('📋 سير عمل بسيط');
    }

    return integrations;
}

/**
 * Calculate estimated completion time
 */
export function estimateCompletionTime(stats: WorkflowStats): string {
    if (stats.stepsWithSLA === 0) return 'غير محدد';

    const hours = stats.totalSLA;

    if (hours < 24) {
        return `${Math.round(hours)} ساعة`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);

    if (remainingHours === 0) {
        return `${days} يوم`;
    }

    return `${days} يوم و ${remainingHours} ساعة`;
}
