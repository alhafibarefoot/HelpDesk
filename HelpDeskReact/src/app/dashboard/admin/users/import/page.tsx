'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, UploadCloud, AlertTriangle } from "lucide-react";

export default function ImportUsersPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [rawText, setRawText] = useState("");
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncErrors, setSyncErrors] = useState<string[]>([]);

    // 1. Parser Logic (Excel Copy-Paste = TSV)
    const handleParse = () => {
        setIsThinking(true);
        setSyncErrors([]);
        try {
            const rows = rawText.trim().split('\n');
            if (rows.length < 2) {
                toast({ variant: "destructive", title: "بيانات غير كافية", description: "يرجى لصق صفوف متعددة (العناوين + البيانات)." });
                setIsThinking(false);
                return;
            }

            // Detect delimiter and Normalize Headers
            const originalHeaders = rows[0].split('\t').map(h => h.trim());
            const headers = originalHeaders.map(h => {
                const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                // Map common variations
                if (norm === 'email' || norm === 'employeeemail') return 'email';
                if (norm === 'employeeid' || norm === 'authorizeduserid') return 'employeeid';
                if (norm === 'managerid' || norm === 'manager') return 'managerid';
                if (norm === 'employeenamear' || norm === 'fullname' || norm === 'name') return 'fullname';
                return norm; // Keep others as is (e.g. testemail, personalemail)
            });

            const data = [];

            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split('\t');
                const rowObj: any = {};
                headers.forEach((header, index) => {
                    rowObj[header] = values[index]?.trim() || "";
                });

                // Fallback: If 'email' key is empty, check for 'testemail' or 'personalemail' just in case the mapping missed
                if (!rowObj.email && rowObj.employeeemail) rowObj.email = rowObj.employeeemail;

                // VALIDATION: Only add if it has valid Email data
                // Must contain '@' and be at least 6 characters (x@x.xx)
                if (rowObj.email && rowObj.email.includes('@') && rowObj.email.length > 5 && rowObj.email !== 'NULL') {
                    data.push(rowObj);
                } else if (!rowObj.email) {
                    console.log('Skipping row due to missing email:', rowObj);
                }
            }

            if (data.length === 0) {
                toast({ variant: "destructive", title: "فشل التحليل", description: "لم يتم العثور على أي بريد إلكتروني صالح (تأكد من وجود عمود Email يحتوي على @)." });
            } else {
                setPreviewData(data);
                toast({ title: "تم تحليل البيانات", description: `تم العثور على ${data.length} سجل صالح وجاهز للمزامنة.` });
            }

        } catch (e) {
            toast({ variant: "destructive", title: "خطأ في التحليل", description: "تأكد من نسخ البيانات بشكل صحيح من Excel." });
        } finally {
            setIsThinking(false);
        }
    };

    // 2. Submit to API
    const handleSync = async () => {
        if (previewData.length === 0) return;
        setIsSyncing(true);
        setSyncErrors([]);

        try {
            const res = await fetch('/api/integrations/hr-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Ensure cookies are sent to prevent 401
                body: JSON.stringify({ users: previewData })
            });

            const result = await res.json();

            if (res.ok) {
                const { updated, processed, errors } = result.results;
                setSyncErrors(errors || []);

                if (updated === 0 && (!result.results.created || result.results.created === 0)) {
                    toast({
                        variant: "default",
                        className: "bg-yellow-50 text-yellow-900 border-yellow-200",
                        title: "تنبيه: لم يتم عمل أي تغيير!",
                        description: "لم يتم العثور على مطابقة أو إنشاء مستخدمين جدد. راجع القائمة أدناه."
                    });
                } else if (errors && errors.length > 0) {
                    toast({
                        variant: "default",
                        className: "bg-orange-50 text-orange-900 border-orange-200",
                        title: "تمت المزامنة والإنشاء جزئياً",
                        description: `تم تحديث: ${updated}، تم إنشاء: ${result.results.created || 0}، أخطاء/تخطي: ${errors.length}`
                    });
                } else {
                    toast({
                        title: "تم المزامنة بنجاح!",
                        description: `تم تحديث: ${updated}، تم إنشاء: ${result.results.created || 0}`
                    });
                    setTimeout(() => router.push('/dashboard/admin/users'), 2500);
                }
            } else {
                toast({ variant: "destructive", title: "فشل المزامنة", description: result.error || result.message });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "خطأ", description: "فشل الاتصال بالخادم. تحقق من الشبكة." });
            console.error(e);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-5xl px-4" dir="rtl">
            <h1 className="text-3xl font-bold mb-6">استيراد بيانات الموظفين (Excel)</h1>

            <div className="grid gap-8">
                {/* Error/Skipped List - Shows ONLY if specific errors exist */}
                {syncErrors.length > 0 && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-yellow-800 text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                سجلات تم تخطيها / أخطاء ({syncErrors.length})
                            </CardTitle>
                            <CardDescription className="text-yellow-700">
                                راجع القائمة أدناه لمعرفة سبب الفشل لكل سجل.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-60 overflow-auto text-sm text-yellow-800 font-mono bg-white p-3 rounded border border-yellow-100 shadow-inner" dir="ltr">
                                {syncErrors.map((err, i) => (
                                    <div key={i} className="border-b border-gray-100 last:border-0 py-1">
                                        {err}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 1: Paste Area */}
                <Card>
                    <CardHeader>
                        <CardTitle>1. الصق البيانات هنا</CardTitle>
                        <CardDescription>
                            قم بنسخ الأعمدة من Excel (بما في ذلك العناوين) والصقها هنا.
                            <br />
                            تأكد من وجود الأعمدة: <b>Email, EmployeeID, ManagerID</b>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder={`EmployeeID | Full Name | Email | ManagerID\n1055 | Ahmed | ahmed@test.com ...`}
                            rows={8}
                            className="font-mono text-sm"
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                        />
                        <Button onClick={handleParse} disabled={!rawText || isThinking} variant="secondary">
                            {isThinking ? "جاري التحليل..." : "تحليل البيانات"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Step 2: Preview & Sync */}
                {previewData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>2. معاينة والمزامنة ({previewData.length} سجل)</span>
                                <Button onClick={handleSync} disabled={isSyncing}>
                                    {isSyncing ? <Loader2 className="ml-2 w-4 h-4 animate-spin" /> : <UploadCloud className="ml-2 w-4 h-4" />}
                                    بدء المزامنة
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-64 overflow-auto border rounded">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {Object.keys(previewData[0]).slice(0, 5).map(header => (
                                                <TableHead key={header} className="text-right">{header}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.slice(0, 10).map((row, i) => (
                                            <TableRow key={i}>
                                                {Object.values(row).slice(0, 5).map((val: any, j) => (
                                                    <TableCell key={j}>{val}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">* يتم عرض أول 10 سجلات للمعاينة فقط.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
