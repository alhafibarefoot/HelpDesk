'use client';

import {
    Activity, CheckCircle, Clock, XCircle, FileText,
    BarChart2, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

export type StatusCount = { status: string; count: number };
export type PriorityCount = { priority: string; count: number };

export interface RecentRequest {
    id: string;
    request_number: string;
    status: string;
    priority: string;
    created_at: string;
    service?: { name?: string | null } | null;
}

interface OverviewProps {
    statusCounts: StatusCount[];
    priorityCounts: PriorityCount[];
    recentRequests: RecentRequest[];
    activeServicesCount: number;
    hasStatsError?: boolean;
    hasRecentError?: boolean;
}

export default function AdminOverview({
    statusCounts = [],
    priorityCounts = [],
    recentRequests = [],
    activeServicesCount = 0,
    hasStatsError = false,
    hasRecentError = false
}: OverviewProps) {

    // Helper to get count for a specific status safely
    const getCount = (key: string) => statusCounts.find(s => s.status === key)?.count || 0;
    const totalRequests = statusCounts.reduce((sum, item) => sum + item.count, 0);

    const getPriorityCount = (key: string) => priorityCounts.find(p => p.priority === key)?.count || 0;

    return (
        <div dir="rtl" className="space-y-8">

            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-gray-900">لوحة متابعة الطلبات (المشرفين)</h1>
                <p className="text-gray-500">عرض نظرة عامة على جميع الطلبات في النظام ومؤشراتها.</p>
            </div>

            {/* Error Banner for Stats */}
            {hasStatsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>تعذر تحميل بعض بيانات الإحصائيات، يرجى المحاولة لاحقًا.</span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-l-4 border-l-blue-600">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">إجمالي الطلبات</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRequests}</div>
                        <p className="text-xs text-gray-500 mt-1">جميع الطلبات للنظام</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-yellow-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">الطلبات الجديدة</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{getCount('جديد')}</div>
                        <p className="text-xs text-gray-500 mt-1">بانتظار الإجراء</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-green-600">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">الطلبات المكتملة</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{getCount('مكتمل')}</div>
                        <p className="text-xs text-gray-500 mt-1">تم إنجازها بنجاح</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">الطلبات المرفوضة</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{getCount('مرفوض')}</div>
                        <p className="text-xs text-gray-500 mt-1">تم رفضها</p>
                    </CardContent>
                </Card>
            </div>

            {/* Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Priority Distribution */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-gray-500" />
                                توزيع الأولوية
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { label: 'عاجل', key: 'عاجل', color: 'bg-red-500', bg: 'bg-red-100' },
                                { label: 'مرتفع', key: 'مرتفع', color: 'bg-orange-500', bg: 'bg-orange-100' },
                                { label: 'متوسط', key: 'متوسط', color: 'bg-blue-500', bg: 'bg-blue-100' },
                                { label: 'منخفض', key: 'منخفض', color: 'bg-gray-500', bg: 'bg-gray-100' },
                            ].map((p) => {
                                const count = getPriorityCount(p.key);
                                const percentage = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
                                return (
                                    <div key={p.key} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-gray-700">{p.label}</span>
                                            <span className="text-gray-500">{count} ({percentage}%)</span>
                                        </div>
                                        <div className={`h-2 w-full rounded-full ${p.bg}`}>
                                            <div
                                                className={`h-2 rounded-full ${p.color}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="pt-4 mt-6 border-t flex justify-between items-center text-sm">
                                <span className="text-gray-500">الخدمات النشطة</span>
                                <Badge variant="secondary" className="px-3">{activeServicesCount}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Requests Table */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart2 className="h-5 w-5 text-gray-500" />
                                أحدث الطلبات
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="text-gray-500 border-b">
                                        <tr>
                                            <th className="pb-3 pr-2">رقم الطلب</th>
                                            <th className="pb-3">الخدمة</th>
                                            <th className="pb-3">الحالة</th>
                                            <th className="pb-3">الأولوية</th>
                                            <th className="pb-3 pl-2 text-left">التاريخ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y relative">
                                        {hasRecentError ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-red-500">
                                                    تعذر تحميل قائمة أحدث الطلبات حاليًا.
                                                </td>
                                            </tr>
                                        ) : recentRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500">
                                                    لا توجد طلبات مسجلة حتى الآن.
                                                </td>
                                            </tr>
                                        ) : (
                                            recentRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-gray-50">
                                                    <td className="py-3 pr-2 font-mono font-medium text-gray-700">
                                                        <Link
                                                            href={`/dashboard/user/requests/${req.id}`}
                                                            className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                                                        >
                                                            #{req.request_number}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 text-gray-600">{req.service?.name || '-'}</td>
                                                    <td className="py-3">
                                                        <Badge variant={
                                                            req.status === 'مكتمل' ? 'default' :
                                                                req.status === 'مرفوض' ? 'destructive' : 'secondary'
                                                        } className={
                                                            req.status === 'مكتمل' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                                                req.status === 'قيد التنفيذ' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                                                    req.status === 'مرفوض' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                                                        'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                        }>
                                                            {req.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`
                                                            inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                                            ${req.priority === 'عاجل' ? 'bg-red-50 text-red-700' :
                                                                req.priority === 'مرتفع' ? 'bg-orange-50 text-orange-700' :
                                                                    'bg-gray-100 text-gray-700'}
                                                        `}>
                                                            {req.priority}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pl-2 text-left text-gray-500" dir="ltr">
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
            </div>

        </div>
    );
}
