'use client';

import { WorkflowTask } from "@/app/actions/tasks";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, FileText, Briefcase, CheckSquare } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { enGB } from "date-fns/locale";

interface Props {
    initialTasks: WorkflowTask[];
}

export function TaskList({ initialTasks }: Props) {
    if (initialTasks.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CheckSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">لا توجد مهام معلقة</h3>
                <p className="text-gray-500 mt-1">أنت حر! لا توجد مهام تتطلب انتباهك حالياً.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow duration-200 border-t-4 border-t-blue-500">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                {task.request?.service?.name || 'خدمة'}
                            </Badge>
                            <span className="text-xs text-gray-400 font-mono" dir="ltr">
                                {task.request?.request_number}
                            </span>
                        </div>
                        <CardTitle className="text-lg mt-2 leading-snug line-clamp-2">
                            {task.request?.title || `طلب: ${task.request?.service?.name}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span>الخطوة الحالية: <span className="font-medium text-gray-900">{task.step_id}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>تعيين: {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: enGB })}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 border-t bg-gray-50/50 flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                            {task.assigned_to_role ? (
                                <span className="flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    {task.assigned_to_role}
                                </span>
                            ) : 'تعيين مباشر'}
                        </div>

                        {/* Updated Link to point to the correct Task Action Page */}
                        {/* Previously linked to /dashboard/user/tasks/[id] */}
                        {/* We should ensure that page exists or redirect logic is sound */}
                        <Link href={`/dashboard/user/requests/${task.request_id}`}>
                            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                أداء المهمة
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
