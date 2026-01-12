
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Inspecting Current Tables...");

    // Check Users
    const { data: usersVals } = await supabase.from('users').select('*').limit(1);
    if (usersVals && usersVals.length) {
        console.log("Users Table Keys:", Object.keys(usersVals[0]));
    }

    // Check Services
    const { data: serviceVals } = await supabase.from('services').select('*').limit(1);
    if (serviceVals && serviceVals.length) {
        console.log("Services Table Keys:", Object.keys(serviceVals[0]));
    }
}

main();
