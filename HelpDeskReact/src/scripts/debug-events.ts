
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("Missing Service Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Fetch the latest request
    const { data: request, error } = await supabase
        .from('requests')
        .select('id, request_number, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching request:", error);
        return;
    }

    console.log(`Latest Request: ${request.request_number} (${request.id}) created at ${request.created_at}`);

    // Fetch events for this request
    const { data: events, error: eventsError } = await supabase
        .from('request_events')
        .select('*')
        .eq('request_id', request.id);

    if (eventsError) {
        console.error("Error fetching events:", eventsError);
    } else {
        console.log(`Events found: ${events.length}`);
        console.log(JSON.stringify(events, null, 2));
    }
}

main();
