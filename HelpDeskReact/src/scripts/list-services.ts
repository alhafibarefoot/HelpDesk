
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching Services...\n");
    const { data: services, error } = await supabase
        .from('services')
        .select('id, key, name, status')
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!services || services.length === 0) {
        console.log("No services found.");
        return;
    }

    services.forEach(s => {
        console.log(`- ${s.name} (Key: ${s.key}) [${s.status}]`);
    });
}

main();
