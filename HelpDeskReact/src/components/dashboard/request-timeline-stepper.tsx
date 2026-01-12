import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestTimelineStepperProps {
    status: string;
    createdAt: string;
    lastStatusChange?: string;
    assignedRole?: string;
    workflowNodes?: any[];
    className?: string;
}

export function RequestTimelineStepper({
    status,
    createdAt,
    lastStatusChange,
    assignedRole,
    workflowNodes,
    className,
}: RequestTimelineStepperProps) {

    // Custom precise duration formatter
    const getPreciseDuration = (dateString: string) => {
        try {
            const start = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - start.getTime();

            if (diffMs < 0) return "0 دقيقة";

            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (diffHrs > 0) {
                return `${diffHrs} ساعة و ${diffMins} دقيقة`;
            }
            return `${diffMins} دقيقة`;
        } catch (e) {
            return "غير معروف";
        }
    };

    // --- Dynamic Steps Logic ---
    let steps = [
        { label: "تم تقديم الطلب", value: "new", role: null },
        { label: assignedRole ? `عند: ${assignedRole}` : "قيد التنفيذ", value: "processing", role: assignedRole },
        { label: "اتخاذ القرار", value: "decision", role: null },
    ];

    if (workflowNodes && workflowNodes.length > 0) {
        // Simple linear extraction: Filter usable steps
        const relevantTypes = ['start', 'approval', 'action', 'task', 'end'];
        const dynamicSteps = workflowNodes
            .filter(n => relevantTypes.includes(n.type))
            .map(n => ({
                label: n.data?.label || (n.type === 'start' ? 'البداية' : n.type === 'end' ? 'النهاية' : n.type),
                value: n.id,
                role: n.data?.role
            }));

        if (dynamicSteps.length >= 2) {
            steps = dynamicSteps;
        }
    }

    let currentStepIndex = 0;

    // Determine Current Step Index
    if (['مكتمل', 'Completed', 'مرفوض', 'Rejected', 'cancelled', 'ملغي'].includes(status)) {
        currentStepIndex = steps.length - 1;
    } else if (status === 'جديد' || status === 'New') {
        currentStepIndex = 0;
    } else if (assignedRole) {
        // Find step matching the role
        const roleIndex = steps.findIndex(s => s.role === assignedRole);
        if (roleIndex !== -1) currentStepIndex = roleIndex;
        else currentStepIndex = Math.floor(steps.length / 2); // Fallback to middle
    } else {
        currentStepIndex = 1; // Fallback
    }

    let statusColor = "bg-blue-600";
    let isRejected = status === "مرفوض" || status === "Rejected" || status === "cancelled" || status === "ملغي";

    if (isRejected) statusColor = "bg-red-600";
    else if (status === "مكتمل" || status === "Completed") statusColor = "bg-green-600";

    // Calculate duration in current stage
    const timeInStageBase = lastStatusChange || createdAt;
    const durationInStage = getPreciseDuration(timeInStageBase);

    // Determine current label safely
    const currentStepLabel = steps[currentStepIndex]?.label || "غير معروف";

    // Determine display status label for the badge
    let statusDisplayLabel = currentStepLabel;
    if (status === 'مكتمل') statusDisplayLabel = "تم الاعتماد";
    else if (status === 'مرفوض') statusDisplayLabel = "تم الرفض";
    else if (status === 'cancelled' || status === 'ملغي') statusDisplayLabel = "تم السحب";

    return (
        <div className={cn("w-full py-4", className)} dir="rtl">
            {/* Current Stage & Duration Info */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
                {/* Current Stage Badge */}
                <div className="flex items-center gap-3 bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <div className={cn("p-2 rounded-full", isRejected ? "bg-red-100" : "bg-blue-100")}>
                        {isRejected ? (
                            <X className="w-4 h-4 text-red-600" />
                        ) : (
                            <Check className="w-4 h-4 text-blue-600" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">المرحلة الحالية</span>
                        <span className="text-sm font-bold text-gray-900">
                            {statusDisplayLabel}
                        </span>
                    </div>
                </div>

                {/* Duration Badge */}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">المدة في المرحلة</span>
                        <span className="text-sm font-bold text-blue-700">{durationInStage}</span>
                    </div>
                </div>
            </div>

            {/* Stepper */}
            <div className="relative flex items-center justify-between w-full max-w-5xl mx-auto overflow-x-auto pb-4">
                {/* Connecting Line - Background */}
                <div className="absolute top-[20px] left-0 right-0 h-1 bg-gray-200 -z-10 rounded-full min-w-[300px]" />

                {/* Connecting Line - Progress */}
                <div
                    className={cn("absolute top-[20px] right-0 h-1 -z-10 rounded-full transition-all duration-500", statusColor)}
                    style={{
                        width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
                    }}
                />

                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex || (idx === currentStepIndex && (status === 'مكتمل' || status === 'مرفوض'));
                    const isCurrent = idx === currentStepIndex && status !== 'مكتمل' && status !== 'مرفوض';
                    const isLastStep = idx === steps.length - 1;

                    let icon = <Check className="w-5 h-5 text-white" />;
                    let circleClass = cn("w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-all duration-300 z-10",
                        isCompleted ? statusColor :
                            isCurrent ? "bg-white border-blue-600 text-blue-600 ring-4 ring-blue-100" :
                                "bg-gray-100 text-gray-400"
                    );

                    if (isLastStep && isRejected) {
                        icon = <X className="w-5 h-5 text-white" />;
                    } else if (isCurrent) {
                        icon = <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />;
                    } else if (!isCompleted) {
                        icon = <span className="text-sm font-semibold">{idx + 1}</span>;
                    }

                    // Special label for last step
                    let label = step.label;

                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 relative bg-transparent px-2 min-w-[80px]">
                            <div className={circleClass}>
                                {icon}
                            </div>
                            <span className={cn("text-xs font-bold text-center max-w-[120px]",
                                (isCompleted || isCurrent) ? "text-gray-900" : "text-gray-400"
                            )}>
                                {label}
                            </span>
                            {step.role && <span className="text-[10px] text-gray-400">{step.role}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
