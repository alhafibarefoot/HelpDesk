import Link from "next/link";
import { Service } from "@/types";
import { Settings, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceManagementCardProps {
    service: Service;
    stats?: {
        totalRequests: number;
        activeRequests: number;
        avgCompletionTime: string;
    };
}

export function ServiceManagementCard({ service, stats }: ServiceManagementCardProps) {
    return (
        <div className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-xl hover:border-blue-300">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{service.name}</h3>
                        <p className="text-sm text-blue-100">{service.key}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{stats.totalRequests}</div>
                            <div className="text-xs text-gray-500">إجمالي الطلبات</div>
                        </div>
                        <div className="text-center border-x border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{stats.activeRequests}</div>
                            <div className="text-xs text-gray-500">قيد المعالجة</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{stats.avgCompletionTime}</div>
                            <div className="text-xs text-gray-500">متوسط الإنجاز</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>SLA: {service.default_sla_hours} ساعة</span>
                </div>

                {service.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
                )}

                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${service.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-500">
                        {service.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 flex gap-2">
                <Link href={`/dashboard/admin/workflows/${service.key}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full hover:bg-blue-50 hover:border-blue-300">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        المخطط
                    </Button>
                </Link>
                <Link href={`/dashboard/admin/services/${service.key}/form`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full hover:bg-purple-50 hover:border-purple-300">
                        <Settings className="w-4 h-4 mr-2" />
                        النموذج
                    </Button>
                </Link>
            </div>
        </div>
    );
}
