import { getUserTasks } from "@/app/actions/tasks";
import { TaskList } from "@/components/dashboard/task-list";
import { Inbox } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
    // New Logic: Use the unified getUserTasks action that handles Delegation and RLS via Code
    const tasks = await getUserTasks();

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Inbox className="w-8 h-8 text-blue-600" />
                        صندوق المهام (Inbox)
                    </h1>
                    <p className="text-gray-500 mt-2">
                        المهام المعلقة التي تتطلب اتخاذ إجراء منك (بما في ذلك التفويضات).
                    </p>
                </div>
            </div>

            {/* Reused Task List Component */}
            <TaskList initialTasks={tasks} />
        </div>
    );
}
