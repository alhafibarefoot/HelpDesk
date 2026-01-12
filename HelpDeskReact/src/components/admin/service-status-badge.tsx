"use client"

import { useState } from 'react';
import { ServiceLifecycleStatus } from '@/types';
import { updateServiceStatus } from '@/app/actions';
import { Loader2, ChevronDown } from 'lucide-react';

interface ServiceStatusBadgeProps {
    serviceId: string;
    initialStatus: ServiceLifecycleStatus;
    isActiveLegacy: boolean;
}

export function ServiceStatusBadge({ serviceId, initialStatus, isActiveLegacy }: ServiceStatusBadgeProps) {
    // Fallback to legacy is_active if status is null (temporary migration support)
    const currentStatus = initialStatus || (isActiveLegacy ? 'active' : 'draft');

    const [status, setStatus] = useState<ServiceLifecycleStatus>(currentStatus);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const statusConfig = {
        draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200', dot: 'bg-gray-500' },
        active: { label: 'نشط', color: 'bg-green-100 text-green-700 hover:bg-green-200', dot: 'bg-green-500' },
        suspended: { label: 'معلق', color: 'bg-red-100 text-red-700 hover:bg-red-200', dot: 'bg-red-500' },
        maintenance: { label: 'تحت الصيانة', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', dot: 'bg-yellow-500' }
    };

    const handleStatusChange = async (newStatus: ServiceLifecycleStatus) => {
        setIsUpdating(true);
        setIsOpen(false);
        try {
            await updateServiceStatus(serviceId, newStatus);
            setStatus(newStatus);
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('فشل تحديث حالة الخدمة');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isUpdating}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${statusConfig[status].color}`}
            >
                {isUpdating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <div className={`w-2 h-2 rounded-full ${statusConfig[status].dot}`} />
                )}
                <span>{statusConfig[status].label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                    {(Object.keys(statusConfig) as ServiceLifecycleStatus[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => handleStatusChange(key)}
                            className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${status === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${statusConfig[key].dot}`} />
                            {statusConfig[key].label}
                        </button>
                    ))}
                </div>
            )}

            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
