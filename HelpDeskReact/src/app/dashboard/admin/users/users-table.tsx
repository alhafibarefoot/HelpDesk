'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, UserCog, Shield, User, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { updateUser } from '@/app/actions/users';
import { useToast } from "@/components/ui/use-toast";

interface UserData {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
    created_at: string;
    employee_id?: string;
}

interface Props {
    initialUsers: UserData[];
}

export function UsersTable({ initialUsers }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState(initialUsers);

    // Edit State
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({ full_name: "", role: "" });
    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);

    const filteredUsers = users.filter(user => {
        const q = searchQuery.toLowerCase();
        return (
            (user.full_name?.toLowerCase() || "").includes(q) ||
            (user.email?.toLowerCase() || "").includes(q)
        );
    });

    const getRoleBadge = (role?: string) => {
        switch (role) {
            case 'admin':
                return <Badge variant="destructive" className="gap-1"><Shield className="w-3 h-3" /> مدير نظام</Badge>;
            case 'helpdesk_admin':
                return <Badge className="bg-orange-500 gap-1"><UserCog className="w-3 h-3" /> مشرف دعم</Badge>;
            case 'employee':
                return <Badge variant="outline" className="gap-1 text-blue-600 bg-blue-50 border-blue-200"><User className="w-3 h-3" /> موظف</Badge>;
            default:
                return <Badge variant="secondary" className="gap-1">{role || 'مستخدم'}</Badge>;
        }
    };

    const handleEditClick = (user: UserData) => {
        setEditingUser(user);
        setFormData({
            full_name: user.full_name || "",
            role: user.role || "employee"
        });
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setIsSaving(true);

        try {
            const result = await updateUser(editingUser.id, {
                full_name: formData.full_name,
                role: formData.role
            });

            if (result.success) {
                toast({ title: "تم التعديل", description: result.message, variant: "default" });

                // Update local state
                setUsers(prev => prev.map(u =>
                    u.id === editingUser.id ? { ...u, full_name: formData.full_name, role: formData.role } : u
                ));
                setIsOpen(false);
            } else {
                toast({ title: "خطأ", description: result.message, variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            console.log("Starting HR Sync...");
            const res = await fetch('/api/integrations/hr-sync', { method: 'POST' });
            const data = await res.json();
            console.log("HR Sync Response:", data);

            if (res.ok && data.results) {
                toast({
                    title: "تم المزامنة بنجاح",
                    description: `تم تحديث ${data.results.updated} مستخدم، ومعالجة ${data.results.processed}.`
                });
                router.refresh();
            } else {
                toast({ variant: "destructive", title: "فشل المزامنة", description: data.error || data.message || "Unknown error" });
            }
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "خطأ", description: "تعذر الاتصال بالخادم" });
        } finally {
            setIsSyncing(false);
        }
    };

    // Navigate to Import Page
    const handleImportClick = () => {
        router.push('/dashboard/admin/users/import');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    {/* ... Search ... */}
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث بالاسم أو البريد..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-9"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={handleImportClick}
                    className="gap-2 border-dashed border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600"
                >
                    <UploadCloud className="w-4 h-4" />
                    استيراد/تحديث من Excel
                </Button>
            </div>

            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">الاسم</TableHead>
                            <TableHead className="text-right">البريد الإلكتروني</TableHead>
                            <TableHead className="text-right">الرقم الوظيفي</TableHead>
                            <TableHead className="text-center">الصلاحية</TableHead>
                            <TableHead className="text-right">تاريخ الانضمام</TableHead>
                            <TableHead className="text-left">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    لا يوجد مستخدمين مطابقين
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {user.full_name || "بدون اسم"}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="font-mono text-xs">{user.employee_id || "-"}</TableCell>
                                    <TableCell className="text-center">
                                        {getRoleBadge(user.role)}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.created_at).toLocaleDateString('en-GB')}
                                    </TableCell>
                                    <TableCell className="text-left">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditClick(user)}
                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                        >
                                            تعديل
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-sm text-gray-500">
                إجمالي المستخدمين: {filteredUsers.length}
            </div>

            {/* Edit User Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>تعديل المستخدم</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name" className="text-right">الاسم الكامل</Label>
                            <Input
                                id="name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="role" className="text-right">الصلاحية</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الصلاحية" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">موظف (Employee)</SelectItem>
                                    <SelectItem value="service_owner">مسؤول خدمة (Service Owner)</SelectItem>
                                    <SelectItem value="approver">مشرف موافقات (Approver)</SelectItem>
                                    <SelectItem value="helpdesk_admin">مشرف دعم (Helpdesk Admin)</SelectItem>
                                    <SelectItem value="admin">مدير نظام (Super Admin)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <Label className="text-right text-gray-500 text-xs">البريد الإلكتروني (للعرض فقط)</Label>
                            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">{editingUser?.email}</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>إلغاء</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            حفظ التغييرات
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
