import { Service } from "@/types";
import Link from "next/link";
import { FileText, Headphones, Package, Users, Briefcase, Settings } from "lucide-react";

interface QuickActionsProps {
    services: Service[];
}

const serviceIcons: Record<string, any> = {
    'leave-request': FileText,
    'it-support': Headphones,
    'procurement': Package,
    'hr': Users,
    'general': Briefcase,
    'default': Settings
};

const serviceColors: Record<string, string> = {
    'leave-request': 'from-blue-500 to-blue-600',
    'it-support': 'from-[#3B82F6] to-[#60A5FA]',
    'procurement': 'from-green-500 to-green-600',
    'hr': 'from-orange-500 to-orange-600',
    'general': 'from-gray-500 to-gray-600',
    'default': 'from-indigo-500 to-indigo-600'
};

export function QuickActions({ services }: QuickActionsProps) {
    const activeServices = services.filter(s => s.is_active).slice(0, 6);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">إجراءات سريعة</h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {activeServices.map((service) => {
                        const Icon = serviceIcons[service.key] || serviceIcons.default;
                        const gradient = serviceColors[service.key] || serviceColors.default;

                        return (
                            <Link
                                key={service.id}
                                href={`/requests/new/${service.key}`}
                                className="group"
                            >
                                <div className="relative overflow-hidden rounded-xl border border-gray-200 p-4 transition-all hover:shadow-lg hover:scale-105 hover:border-transparent">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                                            {service.name}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            طلب جديد
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
