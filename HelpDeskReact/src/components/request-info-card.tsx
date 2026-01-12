import { User, Calendar, Hash, Tag } from "lucide-react";
import { Request } from "@/types";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface RequestInfoCardProps {
    request: Request;
}

export function RequestInfoCard({ request }: RequestInfoCardProps) {
    const infoItems = [
        {
            icon: Hash,
            label: "رقم الطلب",
            value: request.request_number,
            color: "text-blue-600 bg-blue-50"
        },
        {
            icon: Tag,
            label: "الخدمة",
            value: request.service?.name || "غير محدد",
            color: "text-purple-600 bg-purple-50"
        },
        {
            icon: User,
            label: "مقدم الطلب",
            value: request.requester?.full_name || "غير معروف",
            color: "text-green-600 bg-green-50"
        },
        {
            icon: Calendar,
            label: "تاريخ التقديم",
            value: format(new Date(request.created_at), "dd MMMM yyyy - HH:mm", { locale: ar }),
            color: "text-orange-600 bg-orange-50"
        },
    ];

    if (request.priority) {
        infoItems.push({
            icon: Tag,
            label: "الأولوية",
            value: request.priority,
            color: request.priority === "عاجل" ? "text-red-600 bg-red-50" :
                request.priority === "مرتفع" ? "text-orange-600 bg-orange-50" :
                    "text-blue-600 bg-blue-50"
        });
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">معلومات الطلب</h2>
            </div>
            <div className="p-6 space-y-4">
                {infoItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <div key={index} className="flex items-start gap-3">
                            <div className={`${item.color} p-2 rounded-lg`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-500 mb-1">{item.label}</p>
                                <p className="text-base font-semibold text-gray-900 break-words">{item.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
