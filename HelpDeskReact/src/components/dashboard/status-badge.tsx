import { ServiceStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: ServiceStatus;
  className?: string;
}

const statusStyles: Record<string, string> = {
  'جديد': "bg-blue-100 text-blue-800",
  'قيد المراجعة': "bg-yellow-100 text-yellow-800",
  'قيد التنفيذ': "bg-purple-100 text-purple-800",
  'موقوف': "bg-gray-100 text-gray-800",
  'مكتمل': "bg-green-100 text-green-800",
  'مرفوض': "bg-red-100 text-red-800",
  'ملغي': "bg-gray-100 text-gray-800",
  'cancelled': "bg-gray-100 text-gray-800", // Fallback for raw enum
  'cancelled by Admin': "bg-gray-100 text-gray-800",
  'متأخر': "bg-orange-100 text-orange-800",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        statusStyles[status] || "bg-gray-100 text-gray-800",
        className
      )}
    >
      {status}
    </span>
  );
}
