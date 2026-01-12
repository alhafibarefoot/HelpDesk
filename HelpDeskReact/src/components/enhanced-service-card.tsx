import Link from "next/link";
import { Service } from "@/types";
import {
    FileText,
    Headphones,
    Package,
    Users,
    Calendar,
    Briefcase,
    ArrowLeft,
    Clock,
    Sparkles
} from "lucide-react";

interface EnhancedServiceCardProps {
    service: Service;
}

const serviceIcons: Record<string, any> = {
    'leave-request': FileText,
    'it-support': Headphones,
    'stationery-request': Package,
    'hall-booking': Calendar,
    'hr': Users,
    'default': Briefcase
};

export function EnhancedServiceCard({ service }: EnhancedServiceCardProps) {
    const Icon = serviceIcons[service.key] || serviceIcons.default;

    return (
        <Link href={`/dashboard/user/requests/new?service=${service.key}`} className="group">
            <div className="relative h-full bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-[#3B82F6]">
                {/* Blue Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />

                {/* Content */}
                <div className="relative p-6">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] flex items-center justify-center mb-4 group-hover:from-[#3B82F6] group-hover:to-[#60A5FA] transition-all duration-300">
                        <Icon className="w-7 h-7 text-[#3B82F6] group-hover:text-white transition-colors duration-300" />
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-lg font-bold text-[#111827] mb-2 group-hover:text-[#3B82F6] transition-colors">
                        {service.name}
                    </h3>
                    <p className="text-sm text-[#6B7280] mb-4 line-clamp-2 min-h-[40px]">
                        {service.description}
                    </p>

                    {/* SLA Badge */}
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-4 bg-[#F9FAFB] px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4 text-[#3B82F6]" />
                        <span>وقت الاستجابة: {service.default_sla_hours} ساعة</span>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#F3F4F6]">
                        <span className="text-sm font-semibold text-[#3B82F6]">
                            تقديم طلب
                        </span>
                        <ArrowLeft className="w-5 h-5 text-[#3B82F6] transform group-hover:-translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
