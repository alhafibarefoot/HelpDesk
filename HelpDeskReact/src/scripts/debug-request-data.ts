
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
        .select(`
            *,
            request_form_values (*)
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching request:", error);
        return;
    }

    console.log("Request ID:", request.id);
    console.log("Request form_data column:", request.form_data);
    console.log("Request form values relation:", request.request_form_values);

    // Also check if there is data in request_form_values table for this request
    const { data: formValues } = await supabase
        .from('request_form_values')
        .select('*')
        .eq('request_id', request.id);

    console.log("Direct query request_form_values:", formValues);
}

main();
