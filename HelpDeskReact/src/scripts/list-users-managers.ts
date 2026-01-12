
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching Users and Managers...\n");

    const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, direct_manager_id');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found.");
        return;
    }

    // Create a map for quick lookup
    const userMap = new Map(users.map(u => [u.id, u.full_name]));

    console.log("---------------------------------------------------------------------------------");
    console.log(pad("User Name", 25) + " | " + pad("Role", 15) + " | " + pad("Direct Manager", 25));
    console.log("---------------------------------------------------------------------------------");

    users.forEach(u => {
        const managerName = u.direct_manager_id ? (userMap.get(u.direct_manager_id) || "Unknown ID") : "---";
        console.log(pad(u.full_name, 25) + " | " + pad(u.role, 15) + " | " + managerName);
    });
    console.log("---------------------------------------------------------------------------------");
}

function pad(str: string, len: number) {
    if (!str) str = "";
    if (str.length >= len) return str.substring(0, len - 3) + "...";
    return str + " ".repeat(len - str.length);
}

main();
