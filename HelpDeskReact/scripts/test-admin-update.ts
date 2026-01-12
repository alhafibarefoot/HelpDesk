
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

console.log('URL:', supabaseUrl);
console.log('Key length:', serviceRoleKey?.length);

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('Fetching latest request...');
    const { data: requests, error: fetchError } = await adminSupabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    if (!requests || requests.length === 0) {
        console.log('No requests found.');
        return;
    }

    const targetRequest = requests[0];
    console.log(`Target Request Keys:`, Object.keys(targetRequest));
    console.log(`Target Request: ${targetRequest.id} (Status: ${targetRequest.status})`);

    console.log('Attempting UPDATE via Admin Client (without updated_at)...');
    const { data: updated, error: updateError } = await adminSupabase
        .from('requests')
        .update({ status: 'cancelled' })
        .eq('id', targetRequest.id)
        .select()
        .single();

    if (updateError) {
        console.error('UPDATE FAILED:', updateError);
        // Check for specific error codes (e.g., P0001 for triggers)
    } else {
        console.log('UPDATE SUCCESS:', updated);

        // Revert change
        console.log('Reverting status...');
        await adminSupabase
            .from('requests')
            .update({ status: targetRequest.status })
            .eq('id', targetRequest.id);
    }
}

main().catch(console.error);
