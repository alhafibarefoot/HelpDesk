"use client"

import { useState } from "react";
import Link from "next/link";
import { Request } from "@/types";
import { StatusBadge } from "./status-badge";
import { RequestFilters, FilterState } from "./request-filters";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Clock, User, Calendar, ArrowLeft, AlertCircle } from "lucide-react";

interface EnhancedRequestListProps {
    requests: Request[];
}

const priorityColors = {
    "منخفض": "text-gray-600 bg-gray-100",
    "متوسط": "text-blue-600 bg-blue-100",
    "مرتفع": "text-orange-600 bg-orange-100",
    "عاجل": "text-red-600 bg-red-100",
};

export function EnhancedRequestList({ requests }: EnhancedRequestListProps) {
    const [filters, setFilters] = useState<FilterState>({
        search: "",
        status: "",
        priority: "",
        service: "",
    });

    // Filter requests based on current filters
    const filteredRequests = requests.filter((request) => {
        const matchesSearch =
            !filters.search ||
            request.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            request.request_number.toLowerCase().includes(filters.search.toLowerCase());

        const matchesStatus = !filters.status || request.status === filters.status;
        const matchesPriority = !filters.priority || request.priority === filters.priority;
        const matchesService =
            !filters.service ||
            request.service?.name.toLowerCase().includes(filters.service.toLowerCase());

        return matchesSearch && matchesStatus && matchesPriority && matchesService;
    });

    if (requests.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        لا توجد طلبات
                    </h3>
                    <p className="text-gray-500 mb-6">لم تقم بتقديم أي طلبات بعد</p>
                    <Link
                        href="/dashboard/services"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        تقديم طلب جديد
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <RequestFilters onFilterChange={setFilters} />

            {filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500">لا توجد نتائج تطابق معايير البحث</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredRequests.map((request) => (
                        <Link
                            key={request.id}
                            href={`/dashboard/user/requests/${request.id}`}
                            className="block group"
                        >
                            <div className="bg-white rounded-xl border border-gray-200 p-6 transition-all hover:shadow-lg hover:border-blue-300">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-mono text-gray-500">
                                                {request.request_number}
                                            </span>
                                            <StatusBadge status={request.status} />
                                            {request.priority && (
                                                <span
                                                    className={`text-xs font-medium px-2 py-1 rounded-full ${priorityColors[request.priority as keyof typeof priorityColors] ||
                                                        priorityColors["متوسط"]
                                                        }`}
                                                >
                                                    {request.priority}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                            {request.title}
                                        </h3>
                                    </div>
                                    <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowLeft className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span>{request.service?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>
                                            {format(new Date(request.created_at), "dd MMMM yyyy", {
                                                locale: ar,
                                            })}
                                        </span>
                                    </div>
                                    {request.service?.default_sla_hours && (
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span>SLA: {request.service.default_sla_hours} ساعة</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Results count */}
            <div className="mt-6 text-center text-sm text-gray-500">
                عرض {filteredRequests.length} من {requests.length} طلب
            </div>
        </div>
    );
}
