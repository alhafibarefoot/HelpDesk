import { Request } from "@/types";
import { StatusBadge } from "./status-badge";
import { Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";

interface RecentRequestsProps {
    requests: Request[];
    limit?: number;
}

export function RecentRequests({ requests, limit = 5 }: RecentRequestsProps) {
    const recentRequests = requests.slice(0, limit);

    if (recentRequests.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">لا توجد طلبات حديثة</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">الطلبات الحديثة</h3>
            </div>
            <div className="divide-y divide-gray-100">
                {recentRequests.map((request) => (
                    <Link
                        key={request.id}
                        href={`/dashboard/user/requests/${request.id}`}
                        className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium text-gray-900">
                                        {request.request_number}
                                    </span>
                                    <StatusBadge status={request.status} />
                                </div>
                                <p className="text-sm text-gray-900 font-medium mb-1 truncate">
                                    {request.title}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {request.service?.name}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(request.created_at), {
                                            addSuffix: true,
                                            locale: ar,
                                        })}
                                    </span>
                                </div>
                            </div>
                            <div className="text-blue-600 text-sm font-medium whitespace-nowrap">
                                عرض ←
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <Link
                    href="/dashboard/requests"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    عرض جميع الطلبات ←
                </Link>
            </div>
        </div>
    );
}
