
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testCommentInsert() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceKey) {
        console.error("Missing env vars");
        return;
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey);

    // 1. Get a valid user
    const { data: user, error: userError } = await adminSupabase.from('users').select('id, email').limit(1).single();
    if (userError) {
        console.error("Failed to get user:", userError);
        return;
    }
    console.log("Found user:", user.email);

    // 2. Get a valid request
    const { data: request, error: reqError } = await adminSupabase.from('requests').select('id').limit(1).single();
    if (reqError) {
        console.error("Failed to get request:", reqError);
        return;
    }
    console.log("Found request:", request.id);

    // 3. Try Insert Comment
    console.log("Attempting insert...");
    const { data: comment, error: insertError } = await adminSupabase
        .from('request_comments')
        .insert({
            request_id: request.id,
            user_id: user.id,
            content: "Test comment from script"
        })
        .select()
        .single();

    if (insertError) {
        console.error("Insert FAILED:", insertError);
    } else {
        console.log("Insert SUCCESS:", comment);
    }
}

testCommentInsert();
