import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();

    // 1. Auth Check (Admins only ideally, but for now authenticated user)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log(`[System Reset] Starting reset initiated by ${user.email}...`);

        // Deletion Order (Child -> Parent)

        // 1. Level 4: Deepest Dependencies
        await supabase.from('step_field_permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        await supabase.from('workflow_slas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('request_active_steps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('workflow_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('request_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('request_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 2. Level 3: Requests
        const { error: reqError } = await supabase.from('requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (reqError) throw new Error(`Failed to delete requests: ${reqError.message}`);

        // 3. Level 2: Workflows
        const { error: wfError } = await supabase.from('workflows').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (wfError) throw new Error(`Failed to delete workflows: ${wfError.message}`);

        // 4. Level 1: Services
        const { error: srvError } = await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (srvError) throw new Error(`Failed to delete services: ${srvError.message}`);

        console.log('[System Reset] Completed successfully.');

        return NextResponse.json({
            success: true,
            message: 'System data reset successfully. Users preserved.'
        });

    } catch (error: any) {
        console.error('[System Reset] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
