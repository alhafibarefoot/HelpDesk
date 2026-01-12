/**
 * Error Handling & Retry Logic Service
 * Manages error types, retry strategies, and fallback paths
 */

export enum ErrorType {
    NETWORK_ERROR = 'network_error',
    API_TIMEOUT = 'api_timeout',
    VALIDATION_ERROR = 'validation_error',
    INTEGRATION_ERROR = 'integration_error',
    SYSTEM_ERROR = 'system_error',
    PERMISSION_ERROR = 'permission_error',
    DATA_ERROR = 'data_error'
}

export interface RetryConfig {
    enabled: boolean;
    max_attempts: number;        // Default: 3
    delay_seconds: number;       // Initial delay: 30
    backoff_multiplier: number;  // Exponential: 2
    retry_on: ErrorType[];       // Which errors to retry
}

export interface FallbackConfig {
    enabled: boolean;
    fallback_node_id?: string;   // Alternative path
    notify_admin: boolean;
    log_error: boolean;
    escalate_immediately: boolean;
}

export interface ErrorHandlingConfig {
    retry: RetryConfig;
    fallback: FallbackConfig;
}

export interface ErrorLog {
    id: string;
    request_id: string;
    step_id: string;
    error_type: ErrorType;
    error_message: string;
    retry_count: number;
    max_retries: number;
    resolved: boolean;
    resolution_method?: 'retry_success' | 'fallback' | 'manual' | 'timeout';
    created_at: Date;
    resolved_at?: Date;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    enabled: true,
    max_attempts: 3,
    delay_seconds: 30,
    backoff_multiplier: 2,
    retry_on: [
        ErrorType.NETWORK_ERROR,
        ErrorType.API_TIMEOUT,
        ErrorType.INTEGRATION_ERROR
    ]
};

/**
 * Default fallback configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
    enabled: false,
    notify_admin: true,
    log_error: true,
    escalate_immediately: false
};

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
    attemptNumber: number,
    config: RetryConfig
): number {
    const baseDelay = config.delay_seconds * 1000; // Convert to ms
    const delay = baseDelay * Math.pow(config.backoff_multiplier, attemptNumber - 1);

    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);

    return Math.round(delay + jitter);
}

/**
 * Check if error type should be retried
 */
export function shouldRetry(
    errorType: ErrorType,
    attemptNumber: number,
    config: RetryConfig
): boolean {
    if (!config.enabled) return false;
    if (attemptNumber >= config.max_attempts) return false;
    if (!config.retry_on.includes(errorType)) return false;

    return true;
}

/**
 * Get error type from error object
 */
export function classifyError(error: any): ErrorType {
    if (!error) return ErrorType.SYSTEM_ERROR;

    const message = error.message?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
        return ErrorType.NETWORK_ERROR;
    }

    if (message.includes('timeout') || message.includes('timed out')) {
        return ErrorType.API_TIMEOUT;
    }

    if (message.includes('validation') || message.includes('invalid')) {
        return ErrorType.VALIDATION_ERROR;
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
        return ErrorType.PERMISSION_ERROR;
    }

    if (message.includes('integration') || message.includes('api')) {
        return ErrorType.INTEGRATION_ERROR;
    }

    return ErrorType.SYSTEM_ERROR;
}

/**
 * Get user-friendly error message in Arabic
 */
export function getErrorMessage(errorType: ErrorType): string {
    const messages = {
        [ErrorType.NETWORK_ERROR]: 'خطأ في الاتصال بالشبكة',
        [ErrorType.API_TIMEOUT]: 'انتهت مهلة الاتصال',
        [ErrorType.VALIDATION_ERROR]: 'خطأ في التحقق من البيانات',
        [ErrorType.INTEGRATION_ERROR]: 'خطأ في الاتصال بالنظام الخارجي',
        [ErrorType.SYSTEM_ERROR]: 'خطأ في النظام',
        [ErrorType.PERMISSION_ERROR]: 'لا توجد صلاحيات كافية',
        [ErrorType.DATA_ERROR]: 'خطأ في البيانات'
    };

    return messages[errorType] || 'خطأ غير معروف';
}

/**
 * Execute with retry logic
 */
export async function executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig,
    onRetry?: (attempt: number, error: any) => void
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= config.max_attempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const errorType = classifyError(error);

            if (!shouldRetry(errorType, attempt, config)) {
                throw error;
            }

            if (onRetry) {
                onRetry(attempt, error);
            }

            if (attempt < config.max_attempts) {
                const delay = calculateRetryDelay(attempt, config);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Format retry attempts for display
 */
export function formatRetryAttempts(current: number, max: number): string {
    return `المحاولة ${current} من ${max}`;
}
