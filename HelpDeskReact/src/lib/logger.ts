import { createClient } from "@/lib/supabase-server";

export type ErrorType =
    'network_error' | 'api_timeout' | 'validation_error' |
    'integration_error' | 'system_error' | 'permission_error' | 'data_error';

interface LogErrorParams {
    requestId: string;
    stepId?: string; // e.g., 'submit', 'approval', or node ID
    errorType: ErrorType;
    message: string;
    stack?: string;
    metadata?: Record<string, any>;
}

export async function logError(params: LogErrorParams) {
    try {
        const supabase = await createClient();
        console.error(`[SystemError] ${params.errorType}: ${params.message}`, params.metadata);

        const { error } = await supabase.from('error_logs').insert({
            request_id: params.requestId,
            step_id: params.stepId || 'unknown',
            error_type: params.errorType,
            error_message: params.message,
            error_stack: params.stack,
            metadata: params.metadata || {},
            retry_count: 0
        });

        if (error) {
            console.error("Failed to write to error_logs:", error);
        }
    } catch (e) {
        console.error("Critical Failure in Logger:", e);
    }
}
