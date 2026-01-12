import { createClient } from "@/lib/supabase-server";
import { UsersTable } from "./users-table";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const supabase = await createClient();

    // Auth Check (Optional if middleware handles it, but good practice)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Unauthorized</div>;

    // Fetch Users
    const { data: users, error } = await supabase
        .from('users')
        .select('*, employee_id, hr_manager_id')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching users:", error);
    }

    return (
        <div className="container mx-auto py-8 max-w-7xl px-4" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">إدارة المستخدمين</h1>
                    <p className="text-gray-500 mt-2">عرض وإدارة جميع المستخدمين في النظام وصلاحياتهم.</p>
                </div>
            </div>

            <UsersTable initialUsers={users || []} />
        </div>
    );
}
