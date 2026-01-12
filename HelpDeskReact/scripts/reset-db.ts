
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Ideally we need SERVICE_ROLE_KEY for admin deletion without RLS issues, 
// but if RLS policies are permissive for "delete all", anon key might fail.
// Let's assume user has a way to run this.
// Actually, in `src/lib/supabase-server` we usually rely on cookies or service role.
// For a script, we should check if SERVICE_ROLE_KEY exists in env.

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function resetSystem() {
    console.log('[System Reset] Starting reset...');

    try {
        // Deletion Order (Child -> Parent)
        console.log('1. Deleting Dependencies...');
        await supabase.from('step_field_permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('workflow_slas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('request_active_steps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('workflow_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('request_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('request_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        console.log('2. Deleting Requests...');
        const { error: reqError } = await supabase.from('requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (reqError) throw new Error(`requests: ${reqError.message}`);

        console.log('3. Deleting Workflows...');
        const { error: wfError } = await supabase.from('workflows').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (wfError) throw new Error(`workflows: ${wfError.message}`);

        console.log('4. Deleting Services...');
        const { error: srvError } = await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (srvError) throw new Error(`services: ${srvError.message}`);

        console.log('✅ [System Reset] Completed successfully.');

    } catch (error: any) {
        console.error('❌ [System Reset] Error:', error.message);
        process.exit(1);
    }
}

resetSystem();
