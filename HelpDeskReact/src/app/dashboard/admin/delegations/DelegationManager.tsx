'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDelegation, cancelDelegation } from "@/app/actions/tasks";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { UserPlus, ArrowRightLeft, X } from "lucide-react";

interface Props {
    delegations: any[];
    users: any[];
}

export function DelegationManager({ delegations, users }: Props) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    async function handleCreate(formData: FormData) {
        startTransition(async () => {
            const res = await createDelegation(formData);
            if (res.success) {
                toast({ title: "تم", description: "تم إضافة التفويض بنجاح", className: "bg-green-50 text-green-900 border-green-200" });
                // Reset form manually or reload page logic handled by server action revalidate
            } else {
                toast({ variant: "destructive", title: "خطأ", description: res.message });
            }
        });
    }

    async function handleCancel(id: string) {
        if (!confirm('هل أنت متأكد من إلغاء التفويض؟')) return;
        startTransition(async () => {
            await cancelDelegation(id);
            toast({ title: "تم الإلغاء" });
        });
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Form */}
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            إضافة تفويض جديد
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>الموظف البديل (إلى)</Label>
                                <Select name="to_user_id" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر موظف..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.full_name} ({u.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>من تاريخ</Label>
                                    <Input type="datetime-local" name="start_date" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>إلى تاريخ</Label>
                                    <Input type="datetime-local" name="end_date" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>السبب (اختياري)</Label>
                                <Input name="reason" placeholder="إجازة سنوية..." />
                            </div>

                            <Button type="submit" disabled={isPending} className="w-full bg-purple-600 hover:bg-purple-700">
                                حفظ التفويض
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5" />
                            سجل التفويضات
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {delegations.length === 0 && <div className="text-gray-500 text-center py-8">لا توجد تفويضات نشطة</div>}

                            {delegations.map(d => (
                                <div key={d.id} className={`flex items-center justify-between p-4 rounded-lg border ${d.is_active ? 'bg-white border-purple-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${d.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                تفويض إلى: {d.to_user?.full_name}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1 flex gap-3">
                                                <span>من: {format(new Date(d.start_date), 'yyyy/MM/dd HH:mm')}</span>
                                                <span>إلى: {format(new Date(d.end_date), 'yyyy/MM/dd HH:mm')}</span>
                                            </div>
                                            {d.reason && <div className="text-xs text-gray-400 mt-1">{d.reason}</div>}
                                        </div>
                                    </div>
                                    {d.is_active && (
                                        <Button size="sm" variant="ghost" onClick={() => handleCancel(d.id)} className="text-red-500 hover:bg-red-50 hover:text-red-700">
                                            <X className="w-4 h-4" />
                                            إلغاء
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
