'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    FileText, Search, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

// UI-facing type definition (Cleaned up: removed updated_at)
export interface AdminListRequest {
    id: string;
    request_number: string;
    status: string;
    priority: string | null;
    created_at: string;
    serviceName: string;
    serviceKey: string | null;
    requesterName: string;
    requesterEmail: string | null;
}

interface AdminRequestsListProps {
    requests: AdminListRequest[];
    hasError?: boolean;
}

export default function AdminRequestsList({ requests, hasError = false }: AdminRequestsListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Filter Logic
    const filteredRequests = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return requests.filter(req => {
            // 1. Search (Number, Service, Requester)
            const matchesSearch =
                !normalizedSearch ||
                req.request_number.toLowerCase().includes(normalizedSearch) ||
                req.serviceName.toLowerCase().includes(normalizedSearch) ||
                req.requesterName.toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;

            // 2. Status Filter
            if (statusFilter !== 'all' && req.status !== statusFilter) return false;

            // 3. Priority Filter
            if (priorityFilter !== 'all' && req.priority !== priorityFilter) return false;

            return true;
        });
    }, [requests, searchTerm, statusFilter, priorityFilter]);

    // Custom colors using classes since standard variants are limited
    const getStatusClass = (status: string) => {
        if (status === 'مكتمل') return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
        if (status === 'مرفوض') return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
        if (status === 'جديد') return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
        if (status === 'قيد التنفيذ') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
        return 'bg-gray-100 text-gray-800';
    };

    const getPriorityClass = (priority: string | null) => {
        if (priority === 'عاجل') return 'bg-red-50 text-red-700 border-red-200';
        if (priority === 'مرتفع') return 'bg-orange-50 text-orange-700 border-orange-200';
        if (priority === 'متوسط') return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-gray-50 text-gray-700 border-gray-200';
    };

    return (
        <div dir="rtl" className="space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-gray-900">جميع الطلبات (المشرفين)</h1>
                <p className="text-gray-500">عرض وإدارة جميع الطلبات في النظام.</p>
            </div>

            {/* Error Banner */}
            {hasError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>تعذر تحميل بيانات الطلبات حاليًا، يرجى المحاولة لاحقًا.</span>
                </div>
            )}

            {/* Toolbar: Search & Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="بحث برقم الطلب، الخدمة، أو اسم مقدم الطلب..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-9"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="w-full md:w-[200px]">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="الحالة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الحالات</SelectItem>
                                    <SelectItem value="جديد">جديد</SelectItem>
                                    <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                                    <SelectItem value="مكتمل">مكتمل</SelectItem>
                                    <SelectItem value="مرفوض">مرفوض</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority Filter */}
                        <div className="w-full md:w-[200px]">
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="الأولوية" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الأولويات</SelectItem>
                                    <SelectItem value="عاجل">عاجل</SelectItem>
                                    <SelectItem value="مرتفع">مرتفع</SelectItem>
                                    <SelectItem value="متوسط">متوسط</SelectItem>
                                    <SelectItem value="منخفض">منخفض</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Requests Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-500" />
                        قائمة الطلبات
                        <Badge variant="secondary" className="mr-auto text-sm font-normal">
                            عرض {filteredRequests.length} من {requests.length} طلب
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-gray-500 border-b bg-gray-50/50">
                                <tr>
                                    <th className="py-3 pr-4 font-medium">رقم الطلب</th>
                                    <th className="py-3 px-2 font-medium">الخدمة</th>
                                    <th className="py-3 px-2 font-medium">مقدم الطلب</th>
                                    <th className="py-3 px-2 font-medium">الحالة</th>
                                    <th className="py-3 px-2 font-medium">الأولوية</th>
                                    <th className="py-3 pl-4 text-left font-medium">تاريخ الإنشاء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-500">
                                            لا توجد طلبات مسجلة حتى الآن في النظام.
                                        </td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-500">
                                            لا توجد طلبات مطابقة لمعايير البحث الحالية.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.id} className="group hover:bg-gray-50 transition-colors">
                                            <td className="py-4 pr-4">
                                                <Link
                                                    href={`/dashboard/admin/requests/${req.id}`}
                                                    className="font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    #{req.request_number}
                                                </Link>
                                            </td>
                                            <td className="py-4 px-2 text-gray-700">
                                                {req.serviceName}
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{req.requesterName}</span>
                                                    {req.requesterEmail && (
                                                        <span className="text-xs text-gray-500">{req.requesterEmail}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                <Badge
                                                    variant="outline"
                                                    className={`border-0 font-normal ${getStatusClass(req.status)}`}
                                                >
                                                    {req.status}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-2">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getPriorityClass(req.priority)}`}>
                                                    {req.priority || 'غير محدد'}
                                                </span>
                                            </td>
                                            <td className="py-4 pl-4 text-left text-gray-500" dir="ltr">
                                                {new Date(req.created_at).toLocaleDateString('en-GB')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
