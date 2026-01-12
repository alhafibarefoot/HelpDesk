import { RequestAction } from "@/types";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { User, CheckCircle, XCircle, ArrowRightCircle, FileText } from "lucide-react";

interface RequestHistoryProps {
    actions: RequestAction[];
}

export function RequestHistory({ actions }: RequestHistoryProps) {
    if (!actions || actions.length === 0) {
        return <div className="text-gray-500 text-sm">لا يوجد سجل حركات لهذا الطلب.</div>;
    }

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {actions.map((action, actionIdx) => (
                    <li key={action.id}>
                        <div className="relative pb-8">
                            {actionIdx !== actions.length - 1 ? (
                                <span className="absolute top-4 right-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3 space-x-reverse">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${action.action_type === 'اعتماد' ? 'bg-green-500' :
                                            action.action_type === 'رفض' ? 'bg-red-500' :
                                                action.action_type === 'إنشاء' ? 'bg-blue-500' :
                                                    'bg-gray-500'
                                        }`}>
                                        {action.action_type === 'اعتماد' ? <CheckCircle className="h-5 w-5 text-white" /> :
                                            action.action_type === 'رفض' ? <XCircle className="h-5 w-5 text-white" /> :
                                                action.action_type === 'إنشاء' ? <FileText className="h-5 w-5 text-white" /> :
                                                    <ArrowRightCircle className="h-5 w-5 text-white" />}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4 space-x-reverse">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            قام <span className="font-medium text-gray-900">{action.actor?.full_name || 'النظام'}</span> بـ <span className="font-medium text-gray-900">{action.action_type}</span>
                                        </p>
                                        {action.comment && (
                                            <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                                "{action.comment}"
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                        <time dateTime={action.created_at}>{format(new Date(action.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}</time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
