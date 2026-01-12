
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Inspecting Current Schema for Dynamic Assignments Support...");

    // Check Users Table Columns
    const { data: usersVals, error: userError } = await supabase.from('users').select('*').limit(1);
    if (userError) console.error("Error users:", userError);
    if (usersVals && usersVals.length) {
        console.log("Users Table Keys:", Object.keys(usersVals[0]));
    } else if (usersVals) {
        console.log("Users Table accessible but empty.");
        // Insert dummy to check keys? No, better to try and select specific columns we care about in future steps.
    }

    // Check Services Table Columns
    const { data: serviceVals, error: serviceError } = await supabase.from('services').select('*').limit(1);
    if (serviceError) console.error("Error services:", serviceError);
    if (serviceVals && serviceVals.length) {
        console.log("Services Table Keys:", Object.keys(serviceVals[0]));
    }
}

main();
