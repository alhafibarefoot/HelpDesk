import { WorkflowStep, ServiceStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Check, Circle, Clock } from "lucide-react";

interface RequestTimelineProps {
    steps: WorkflowStep[];
    currentStepId?: string;
    status: ServiceStatus;
}

export function RequestTimeline({ steps, currentStepId, status }: RequestTimelineProps) {
    // Determine the index of the current step
    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);

    // If status is completed, all steps are done
    const isCompleted = status === 'مكتمل';
    const isRejected = status === 'مرفوض';

    return (
        <div className="w-full py-6">
            <div className="relative flex items-center justify-between w-full">
                {/* Progress Bar Background */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />

                {/* Steps */}
                {steps.map((step, index) => {
                    let stepStatus: 'completed' | 'current' | 'upcoming' = 'upcoming';

                    if (isCompleted) {
                        stepStatus = 'completed';
                    } else if (isRejected && index === currentStepIndex) {
                        stepStatus = 'current'; // Or rejected specific style
                    } else if (currentStepIndex > index) {
                        stepStatus = 'completed';
                    } else if (currentStepIndex === index) {
                        stepStatus = 'current';
                    }

                    return (
                        <div key={step.id} className="flex flex-col items-center bg-white px-2">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-200",
                                    stepStatus === 'completed' ? "bg-green-500 border-green-500 text-white" :
                                        stepStatus === 'current' ? "bg-blue-100 border-blue-500 text-blue-600" :
                                            "bg-white border-gray-300 text-gray-300"
                                )}
                            >
                                {stepStatus === 'completed' ? (
                                    <Check className="w-5 h-5" />
                                ) : stepStatus === 'current' ? (
                                    <Clock className="w-5 h-5" />
                                ) : (
                                    <Circle className="w-5 h-5" />
                                )}
                            </div>
                            <span className={cn(
                                "mt-2 text-xs font-medium",
                                stepStatus === 'completed' ? "text-green-600" :
                                    stepStatus === 'current' ? "text-blue-600" :
                                        "text-gray-500"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}

                {/* Final Step (Completion) */}
                <div className="flex flex-col items-center bg-white px-2">
                    <div
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-200",
                            isCompleted ? "bg-green-500 border-green-500 text-white" :
                                "bg-white border-gray-300 text-gray-300"
                        )}
                    >
                        <Check className="w-5 h-5" />
                    </div>
                    <span className={cn(
                        "mt-2 text-xs font-medium",
                        isCompleted ? "text-green-600" : "text-gray-500"
                    )}>
                        مكتمل
                    </span>
                </div>

            </div>
        </div>
    );
}
