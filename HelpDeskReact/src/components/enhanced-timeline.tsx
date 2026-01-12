import { WorkflowStep, ServiceStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Check, Circle, Clock, AlertCircle } from "lucide-react";

interface EnhancedTimelineProps {
    steps: WorkflowStep[];
    currentStepId?: string;
    status: ServiceStatus;
}

export function EnhancedTimeline({ steps, currentStepId, status }: EnhancedTimelineProps) {
    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
    const isCompleted = status === 'مكتمل';
    const isRejected = status === 'مرفوض';

    return (
        <div className="w-full py-8">
            <div className="relative">
                {steps.map((step, index) => {
                    let stepStatus: 'completed' | 'current' | 'upcoming' | 'rejected' = 'upcoming';

                    if (isRejected && index === currentStepIndex) {
                        stepStatus = 'rejected';
                    } else if (isCompleted || currentStepIndex > index) {
                        stepStatus = 'completed';
                    } else if (currentStepIndex === index) {
                        stepStatus = 'current';
                    }

                    const isLast = index === steps.length - 1;

                    return (
                        <div key={step.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                            {/* Timeline Line */}
                            {!isLast && (
                                <div className={cn(
                                    "absolute right-6 top-12 bottom-0 w-0.5",
                                    stepStatus === 'completed' ? "bg-green-500" :
                                        stepStatus === 'current' ? "bg-blue-500" :
                                            stepStatus === 'rejected' ? "bg-red-500" :
                                                "bg-gray-200"
                                )} />
                            )}

                            {/* Icon */}
                            <div className="relative flex-shrink-0">
                                <div className={cn(
                                    "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300",
                                    stepStatus === 'completed' ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200" :
                                        stepStatus === 'current' ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200 animate-pulse" :
                                            stepStatus === 'rejected' ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-200" :
                                                "bg-white border-gray-300 text-gray-400"
                                )}>
                                    {stepStatus === 'completed' ? (
                                        <Check className="w-6 h-6" />
                                    ) : stepStatus === 'current' ? (
                                        <Clock className="w-6 h-6" />
                                    ) : stepStatus === 'rejected' ? (
                                        <AlertCircle className="w-6 h-6" />
                                    ) : (
                                        <Circle className="w-6 h-6" />
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className={cn(
                                    "rounded-xl border-2 p-4 transition-all duration-300",
                                    stepStatus === 'completed' ? "bg-green-50 border-green-200" :
                                        stepStatus === 'current' ? "bg-blue-50 border-blue-300 shadow-md" :
                                            stepStatus === 'rejected' ? "bg-red-50 border-red-200" :
                                                "bg-gray-50 border-gray-200"
                                )}>
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <h3 className={cn(
                                                "font-semibold text-lg",
                                                stepStatus === 'completed' ? "text-green-900" :
                                                    stepStatus === 'current' ? "text-blue-900" :
                                                        stepStatus === 'rejected' ? "text-red-900" :
                                                            "text-gray-500"
                                            )}>
                                                {step.name}
                                            </h3>
                                            <p className={cn(
                                                "text-sm",
                                                stepStatus === 'completed' ? "text-green-700" :
                                                    stepStatus === 'current' ? "text-blue-700" :
                                                        stepStatus === 'rejected' ? "text-red-700" :
                                                            "text-gray-500"
                                            )}>
                                                {step.assigned_role} • {step.step_type}
                                            </p>
                                        </div>

                                        {stepStatus === 'current' && step.sla_hours && (
                                            <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                                <Clock className="w-3 h-3" />
                                                {step.sla_hours}ساعة
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mt-2">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
                                            stepStatus === 'completed' ? "bg-green-100 text-green-700" :
                                                stepStatus === 'current' ? "bg-blue-100 text-blue-700" :
                                                    stepStatus === 'rejected' ? "bg-red-100 text-red-700" :
                                                        "bg-gray-100 text-gray-600"
                                        )}>
                                            {stepStatus === 'completed' ? "✓ مكتمل" :
                                                stepStatus === 'current' ? "⏳ قيد المعالجة" :
                                                    stepStatus === 'rejected' ? "✗ مرفوض" :
                                                        "⏸ في الانتظار"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Final Completion Step */}
                <div className="relative flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                        <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300",
                            isCompleted ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200" :
                                "bg-white border-gray-300 text-gray-400"
                        )}>
                            <Check className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className={cn(
                            "rounded-xl border-2 p-4 transition-all duration-300",
                            isCompleted ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                        )}>
                            <h3 className={cn(
                                "font-semibold text-lg",
                                isCompleted ? "text-green-900" : "text-gray-500"
                            )}>
                                اكتمال الطلب
                            </h3>
                            <p className={cn(
                                "text-sm mt-1",
                                isCompleted ? "text-green-700" : "text-gray-500"
                            )}>
                                {isCompleted ? "تم إنجاز الطلب بنجاح" : "في انتظار إتمام جميع الخطوات"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
