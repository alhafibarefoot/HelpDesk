'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard, Search, Plus, AlertCircle, Edit, FileText, ChevronDown, Sparkles, Trash2, Archive, RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { updateServiceStatus, deleteService } from "./actions";
import { AdminService } from "./page";
import ServiceForm from "./ServiceForm";

interface AdminServicesListProps {
    services: AdminService[];
    hasError?: boolean;
}

export default function AdminServicesList({ services, hasError = false }: AdminServicesListProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // Default to 'active' to hide archived/other states

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingService, setEditingService] = useState<AdminService | null>(null);

    // Filter Logic
    const filteredServices = useMemo(() => {
        return services.filter(service => {
            const matchesSearch =
                service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                service.key.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter === 'all' ||
                service.status === statusFilter ||
                (statusFilter === 'archived' && service.status === 'archived');

            return matchesSearch && matchesStatus;
        });
    }, [services, searchTerm, statusFilter]);

    // Handlers
    const handleAddNew = () => {
        setEditingService(null);
        setIsFormOpen(true);
    };

    const handleEdit = (service: AdminService) => {
        setEditingService(service);
        setIsFormOpen(true);
    };

    const handleUpdateStatus = (id: string, newStatus: string) => {
        startTransition(async () => {
            const result = await updateServiceStatus(id, newStatus);
            if (result.success) {
                router.refresh();
            } else {
                alert(result.message);
            }
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`هل أنت متأكد من رغبتك في حذف خدمة "${name}"؟\nلا يمكن التراجع عن هذا الإجراء.`)) {
            startTransition(async () => {
                const result = await deleteService(id);
                if (result.success) {
                    router.refresh();
                } else {
                    alert(result.message);
                }
            });
        }
    };

    return (
        <div dir="rtl" className="space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-gray-900">إدارة الخدمات</h1>
                <p className="text-gray-500">عرض وإدارة قائمة الخدمات المتاحة في النظام.</p>
            </div>

            {hasError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>تعذر تحميل بيانات الخدمات حاليًا، يرجى المحاولة لاحقًا.</span>
                </div>
            )}

            {/* Toolbar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="بحث باسم الخدمة أو المفتاح..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-9"
                            />
                        </div>

                        <div className="w-full md:w-[200px]">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="الحالة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الخدمات</SelectItem>
                                    <SelectItem value="active">الخدمات النشطة</SelectItem>
                                    <SelectItem value="suspended">معطلة (مؤقتاً)</SelectItem>
                                    <SelectItem value="maintenance">تحت الصيانة</SelectItem>
                                    <SelectItem value="archived">الأرشيف</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 gap-2">
                                    <Plus className="h-4 w-4" />
                                    إضافة خدمة جديدة
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={handleAddNew} className="cursor-pointer gap-2">
                                    <Plus className="h-4 w-4" />
                                    <span>إنشاء يدوي</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/admin/ai-assistant" className="cursor-pointer gap-2 w-full flex items-center">
                                        <Sparkles className="h-4 w-4 text-purple-600" />
                                        <span>إنشاء بالذكاء الاصطناعي</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-gray-500" />
                        قائمة الخدمات
                        <Badge variant="secondary" className="mr-auto text-sm font-normal">
                            عرض {filteredServices.length} من {services.length} خدمة
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-gray-500 border-b bg-gray-50/50">
                                <tr>
                                    <th className="py-3 pr-4 font-medium">اسم الخدمة</th>
                                    <th className="py-3 px-2 font-medium">المفتاح</th>
                                    <th className="py-3 px-2 font-medium">الحالة</th>
                                    <th className="py-3 px-2 font-medium">تاريخ الإضافة</th>
                                    <th className="py-3 pl-4 text-left font-medium">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {services.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-500">
                                            لا توجد خدمات مسجلة حتى الآن.
                                        </td>
                                    </tr>
                                ) : filteredServices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-500">
                                            لا توجد خدمات مطابقة لمعايير البحث الحالية.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredServices.map((service) => (
                                        <tr key={service.id} className="group hover:bg-gray-50 transition-colors">
                                            <td className="py-4 pr-4 font-medium text-gray-900">
                                                {service.name}
                                                {service.description && (
                                                    <div className="text-xs text-gray-400 font-normal mt-0.5 line-clamp-1">
                                                        {service.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-2 font-mono text-gray-600" dir="ltr">
                                                {service.key}
                                            </td>
                                            <td className="py-4 px-2">
                                                <Badge
                                                    variant="outline"
                                                    className={`border-0 font-normal ${service.status === 'active' ? 'bg-green-100 text-green-800' :
                                                        service.status === 'suspended' ? 'bg-gray-100 text-gray-600' :
                                                            service.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-purple-50 text-purple-700 border-purple-200'
                                                        }`}
                                                >
                                                    {
                                                        service.status === 'active' ? 'نشط' :
                                                            service.status === 'suspended' ? 'معطل' :
                                                                service.status === 'maintenance' ? 'صيانة' :
                                                                    'مؤرشف'
                                                    }
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-2 text-gray-500" dir="ltr">
                                                {new Date(service.updated_at || service.created_at).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="py-4 pl-4">
                                                <div className="flex justify-end items-center gap-2">

                                                    {/* Unified Edit Button (Settings + Form + Workflow) */}
                                                    <Link
                                                        href={`/dashboard/admin/services/${service.key}`}
                                                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="تعديل الخدمة (البيانات، النموذج، سير العمل)"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Link>



                                                    {/* Delete Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(service.id, service.name)}
                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                        title="حذف الخدمة"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>

                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Form Modal */}
            <ServiceForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                service={editingService}
            />

        </div >
    );
}
