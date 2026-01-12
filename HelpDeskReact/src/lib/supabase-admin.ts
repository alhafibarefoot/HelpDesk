
import { createClient } from '@supabase/supabase-js';

// Note: This client should ONLY be used in server-side contexts (Server Actions / APIs)
// as it uses the Service Role Key which gives bypass-RLS privileges.
export function createSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}
