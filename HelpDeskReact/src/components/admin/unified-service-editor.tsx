"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartFormBuilder } from "@/components/admin/smart-form-builder";
import { EnhancedWorkflowEditor } from "@/components/admin/enhanced-workflow-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, GitBranch, Settings, ArrowRight, Save, Play, Power, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { updateServiceDetails } from "@/app/actions";
import { updateServiceStatus } from "@/app/dashboard/admin/services/actions";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ServiceAssistantChat } from "@/components/admin/service-assistant-chat";

interface Props {
    service: any; // Type strictly later
    initialWorkflow: any;
}

export function UnifiedServiceEditor({ service, initialWorkflow }: Props) {
    const [activeTab, setActiveTab] = useState("form");
    const [serviceData, setServiceData] = useState(service);
    const [workflowData, setWorkflowData] = useState(initialWorkflow);
    const [formData, setFormData] = useState(service.form_schema); // Manage form state locally too
    const [saving, setSaving] = useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            // Update basic info
            await updateServiceDetails(service.id, {
                name: serviceData.name,
                description: serviceData.description,
                icon: serviceData.icon
            });
            toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الخدمة بنجاح" });
        } catch (e) {
            toast({ variant: "destructive", title: "خطأ", description: "فشل الحفظ" });
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await updateServiceStatus(service.id, newStatus);
            setServiceData({
                ...serviceData,
                status: newStatus,
                is_active: newStatus === 'active'
            });
            toast({ title: "تم التحديث", description: "تم تغيير حالة الخدمة بنجاح" });
        } catch (e) {
            toast({ variant: "destructive", title: "خطأ", description: "فشل تغيير الحالة" });
        }
    };

    const handleAIUpdate = (updates: { workflow?: any; form?: any; message: string }) => {
        if (updates.workflow) {
            setWorkflowData(updates.workflow);
        }
        if (updates.form) {
            setFormData(updates.form);
        }
        toast({ title: "تم التحديث", description: updates.message });
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50" dir="rtl">
            {/* Top Header */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/admin/services" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowRight className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {serviceData.name}
                            <Badge variant="outline" className={`
                                ${serviceData.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                ${serviceData.status === 'suspended' ? 'bg-gray-100 text-gray-700 border-gray-200' : ''}
                                ${serviceData.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                                ${serviceData.status === 'archived' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                ${!serviceData.status ? 'bg-gray-100 text-gray-700' : ''} 
                            `}>
                                {
                                    serviceData.status === 'active' ? 'نشط' :
                                        serviceData.status === 'suspended' ? 'معطل' :
                                            serviceData.status === 'maintenance' ? 'صيانة' :
                                                serviceData.status === 'archived' ? 'مؤرشف' :
                                                    'مسودة'
                                }
                            </Badge>
                        </h1>
                        <p className="text-xs text-gray-500 font-mono">{service.key}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
                        <DialogTrigger asChild>
                            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-blue-100 border border-blue-200 transition-all shadow-sm">
                                <Sparkles className="w-3 h-3" />
                                <span>مساعدة الذكاء الاصطناعي</span>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="p-0 sm:max-w-[450px] w-full min-h-[600px] gap-0 overflow-hidden flex flex-col">
                            <div className="sr-only">
                                <DialogTitle>المساعد الذكي</DialogTitle>
                                <DialogDescription>مساعد لتعديل الخدمة</DialogDescription>
                            </div>
                            <ServiceAssistantChat
                                serviceName={serviceData.name}
                                currentWorkflow={workflowData}
                                currentForm={formData}
                                onUpdate={handleAIUpdate}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="bg-white border-b px-6">
                        <TabsList className="bg-transparent p-0 -mb-px">
                            <TabsTrigger
                                value="settings"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-6 py-3"
                            >
                                <Settings className="w-4 h-4 ml-2" />
                                الإعدادات العامة
                            </TabsTrigger>
                            <TabsTrigger
                                value="form"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-6 py-3"
                            >
                                <FileText className="w-4 h-4 ml-2" />
                                تصميم النموذج
                            </TabsTrigger>
                            <TabsTrigger
                                value="workflow"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-6 py-3"
                            >
                                <GitBranch className="w-4 h-4 ml-2" />
                                سير العمل
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 bg-gray-50 overflow-auto p-0">
                        <TabsContent value="settings" className="p-8 max-w-2xl mx-auto h-full space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>بيانات الخدمة</CardTitle>
                                    <CardDescription>البيانات الأساسية التي تظهر للموظفين</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>اسم الخدمة</Label>
                                        <Input
                                            value={serviceData.name}
                                            onChange={(e) => setServiceData({ ...serviceData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>الوصف</Label>
                                        <Input
                                            value={serviceData.description || ''}
                                            onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="pt-4 flex items-center justify-between border-t mt-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex-1">
                                                <Label className="mb-2 block">حالة الخدمة</Label>
                                                <Select
                                                    value={serviceData.status || (serviceData.is_active ? 'active' : 'suspended')}
                                                    onValueChange={handleStatusChange}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="اختر الحالة" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">نشط (Active)</SelectItem>
                                                        <SelectItem value="suspended">معطل (Suspended)</SelectItem>
                                                        <SelectItem value="maintenance">تحت الصيانة (Maintenance)</SelectItem>
                                                        <SelectItem value="archived">مؤرشف (Archived)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-[2] text-sm text-gray-500 pt-6">
                                                {serviceData.status === 'active' && 'الخدمة متاحة لجميع الموظفين المصرح لهم.'}
                                                {serviceData.status === 'suspended' && 'الخدمة متوقفة مؤقتاً ولا تظهر للمستخدمين.'}
                                                {serviceData.status === 'maintenance' && 'الخدمة قيد الصيانة، تظهر ولكن لا يمكن التقديم عليها.'}
                                                {serviceData.status === 'archived' && 'الخدمة مؤرشفة وتم نقلها لسجل الأرشيف.'}
                                            </div>
                                        </div>

                                        <Button onClick={handleSaveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700 mr-auto">
                                            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="form" className="h-full m-0 p-0">
                            {/* We just wrap the existing builder. Since it handles its own saving, we pass props. */}
                            <div className="h-full overflow-y-auto p-6">
                                <SmartFormBuilder
                                    key={JSON.stringify(formData)} // Force re-render on AI update
                                    initialSchema={formData}
                                    serviceId={service.id}
                                    onSave={(schema) => {
                                        setFormData(schema);
                                    }}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="workflow" className="h-full m-0 p-0">
                            <div className="h-full w-full">
                                <EnhancedWorkflowEditor
                                    key={JSON.stringify(workflowData)} // Force re-render on AI update
                                    serviceKey={service.key}
                                    initialNodes={workflowData?.nodes}
                                    initialEdges={workflowData?.edges}
                                    formSchema={formData}
                                />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
