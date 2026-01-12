
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
    console.log("Inspecting request_comments structure...");

    // Insert a dummy event to ensure we can see columns in returned data
    // We'll use a random ID for request_id to avoid FK errors if we don't have a valid one, 
    // actually, let's use the latest request ID from previous step

    const { data: request } = await supabase
        .from('requests')
        .select('id')
        .limit(1)
        .single();

    if (!request) {
        console.error("No requests found to test with.");
        return;
    }

    const { data: comments, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', request.id)
        .limit(1);

    if (error) {
        console.error("Error selecting comments:", error);
    } else if (comments && comments.length > 0) {
        console.log("Columns found in request_comments:", Object.keys(comments[0]));
        console.log("Sample comment:", comments[0]);
    } else {
        console.log("No comments found, but query succeeded.");
        // Try inserting to fail and see error
        const { error: insertError } = await supabase
            .from('request_comments')
            .insert({ request_id: request.id, comment_text: 'test' } as any) // intentional simple insert
            .select()

        if (insertError) console.log("Insert Test Error (reveal columns):", insertError);
    }
}

main();
