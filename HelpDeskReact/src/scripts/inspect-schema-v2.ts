
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("Missing Service Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- START INSPECTION ---");

    const { data: request } = await supabase.from('requests').select('id').limit(1).single();
    if (!request) { console.log("No request found"); return; }

    console.log("Using Request ID:", request.id);

    // Test 1: Try insert with 'content' and 'user_id' (New Schema)
    console.log("Test 1: Insert { user_id, content }");
    const { error: err1 } = await supabase.from('request_comments').insert({
        request_id: request.id,
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        content: "test"
    } as any);
    if (err1) console.log("Test 1 Error:", err1.message, JSON.stringify(err1.details || ""));
    else console.log("Test 1 Success!");

    // Test 2: Try insert with 'comment_text' and 'author_name' (Old Schema)
    console.log("Test 2: Insert { author_name, comment_text }");
    const { error: err2 } = await supabase.from('request_comments').insert({
        request_id: request.id,
        author_name: "Test",
        comment_text: "test"
    } as any);
    if (err2) console.log("Test 2 Error:", err2.message, JSON.stringify(err2.details || ""));
    else console.log("Test 2 Success!");

    console.log("--- END INSPECTION ---");
}

main();
