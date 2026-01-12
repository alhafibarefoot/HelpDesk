
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
    console.log("Probing Schema...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check direct_manager_id
    const { error: userError } = await supabase.from('users').select('direct_manager_id').limit(1);
    if (userError) {
        console.log("Users Probe: FAILED - " + userError.message);
    } else {
        console.log("Users Probe: SUCCESS - direct_manager_id exists.");
    }

    // Check owning_department
    const { error: srvError } = await supabase.from('services').select('owning_department').limit(1);
    if (srvError) {
        console.log("Services Probe: FAILED - " + srvError.message);
    } else {
        console.log("Services Probe: SUCCESS - owning_department exists.");
    }
}

run();
