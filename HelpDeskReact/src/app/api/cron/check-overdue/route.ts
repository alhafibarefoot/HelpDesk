import { NextResponse } from 'next/server';
import { processOverdueRequests } from '@/lib/escalation-service';

/**
 * API Route for checking and processing overdue requests
 * This should be called by a cron job (e.g., Vercel Cron, external scheduler)
 * 
 * Example cron schedule in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-overdue",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: Request) {
    try {
        // Optional: Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[Cron] Starting overdue requests check...');

        const result = await processOverdueRequests();

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Cron] Error processing overdue requests:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Allow manual trigger via POST (for testing)
export async function POST(request: Request) {
    return GET(request);
}
