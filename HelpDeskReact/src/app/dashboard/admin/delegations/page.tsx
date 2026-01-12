import { createClient } from "@/lib/supabase-server";
import { getDelegations, createDelegation, cancelDelegation } from "@/app/actions/tasks";
import { DelegationManager } from "./DelegationManager";
import { Users } from "lucide-react";

export default async function DelegationsPage() {
    const supabase = await createClient();

    // Fetch users for the select dropdown (To User)
    const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

    const delegations = await getDelegations();

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-600 rounded-lg shadow-lg shadow-purple-200">
                    <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">إدارة التفويض</h1>
                    <p className="text-gray-500 mt-1">تفويض الصلاحيات والمهام لموظفين آخرين</p>
                </div>
            </div>

            <DelegationManager
                delegations={delegations}
                users={users || []}
            />
        </div>
    );
}
