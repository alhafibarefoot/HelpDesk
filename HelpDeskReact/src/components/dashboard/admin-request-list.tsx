"use client"

import { useState, useEffect } from "react";
import { Request } from "@/types";
import { StatusBadge } from "./status-badge";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { updateRequestStatus, reassignRequest } from "@/app/actions";
import { UserCog } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AdminRequestListProps {
  requests: Request[];
  users?: { id: string; full_name: string; email: string }[];
}

export function AdminRequestList({ requests: initialRequests, users = [] }: AdminRequestListProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reassign State
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);

  // Sync state with props when server data changes (e.g. pagination)
  // This fixes the issue where navigating pages didn't update the list
  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const handleAction = async (requestId: string, status: string) => {
    setProcessingId(requestId);
    try {
      const result = await updateRequestStatus(requestId, status);
      // Optimistically update the UI, but better rely on revalidate
      // setRequests(prev => prev.map(r =>
      //   r.id === requestId ? { ...r, status: status } : r
      // ));
      // We will just refresh the page data implicitly via Next.js server actions revalidation
      // or we can optimistically set to "Updating..."?
      // Let's assume revalidatePath in action does the job.
      window.location.reload(); // Force reload to get fresh task/columns
      // alert(result.message);
    } catch (error) {
      console.error("Error updating request:", error);
      alert("حدث خطأ أثناء تحديث الحالة");
    } finally {
      setProcessingId(null);
    }
  };

  const openReassign = (requestId: string) => {
    setSelectedRequestId(requestId);
    setSelectedUserId("");
    setSearchUserQuery("");
    setReassignOpen(true);
  };

  const handleReassign = async () => {
    if (!selectedRequestId || !selectedUserId) return;

    setReassignLoading(true);
    try {
      const result = await reassignRequest(selectedRequestId, selectedUserId);
      if (result.success) {
        setReassignOpen(false);
        // Maybe show toast or alert?
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (e: any) {
      alert("فشل التحويل: " + e.message);
    } finally {
      setReassignLoading(false);
    }
  };


  if (requests.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-dashed">
        <p className="text-gray-500">لا توجد طلبات معلقة</p>
      </div>
    );
  }

  return (
    <>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[140px]">
                  رقم الطلب
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  مقدم الطلب
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  الخدمة
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  المسؤول الحالي
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  منذ
                </th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-[120px]">
                  الحالة
                </th>
                <th scope="col" className="relative px-6 py-4 w-[140px]">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request: any) => (
                <tr key={request.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {request.request_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{request.requester?.full_name || 'غير معروف'}</span>
                      <span className="text-xs text-gray-500">{request.requester?.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {request.service?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-middle">
                    {request.pendingWith && request.pendingWith !== '-' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs">
                          <UserCog className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{request.pendingWith}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-middle" dir="rtl">
                    {request.pendingSince
                      ? <span suppressHydrationWarning className="inline-flex items-center bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200">
                        {(() => {
                          const diff = Math.abs(new Date().getTime() - new Date(request.pendingSince).getTime());
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          const days = Math.floor(hours / 24);
                          const remainingHours = hours % 24;

                          if (days > 0) return `${days} يوم و ${remainingHours} ساعة`;
                          if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
                          return `${minutes} دقيقة`;
                        })()}
                      </span>
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="تحويل المسؤولية"
                        onClick={() => openReassign(request.id)}
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>

                      {/* Only Close (Complete) Action */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-gray-300 text-gray-700 hover:bg-gray-50 px-3"
                        title="إغلاق الطلب"
                        disabled={!!processingId || request.status === 'مكتمل' || request.status === 'مرفوض'}
                        onClick={() => handleAction(request.id, 'مكتمل')}
                      >
                        {processingId === request.id ? '...' : 'إغلاق الطلب'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تحويل الطلب</DialogTitle>
            <DialogDescription>
              اختر الموظف الذي تريد تحويل الطلب إليه. سيتم تحديث المهمة الحالية المعلقة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-users" className="text-right block">
                  بحث عن موظف
                </Label>
                <div className="relative">
                  <input
                    id="search-users"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                    placeholder="اكتب الاسم للبحث..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="border rounded-md h-[200px] overflow-y-auto">
                {users
                  .filter(u =>
                    !searchUserQuery ||
                    (u.full_name && u.full_name.toLowerCase().includes(searchUserQuery.toLowerCase())) ||
                    (u.email && u.email.toLowerCase().includes(searchUserQuery.toLowerCase()))
                  )
                  .map(u => (
                    <div
                      key={u.id}
                      className={`p-3 cursor-pointer flex justify-between items-center hover:bg-gray-50 transition-colors ${selectedUserId === u.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <div className="text-right">
                        <div className="font-medium text-sm text-gray-900">{u.full_name || 'بدون اسم'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                      {selectedUserId === u.id && (
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                      )}
                    </div>
                  ))}
                {users.length > 0 && users.filter(u => !searchUserQuery || (u.full_name && u.full_name.toLowerCase().includes(searchUserQuery.toLowerCase()))).length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">لا يوجد نتائج</div>
                )}
              </div>
              {selectedUserId && (
                <div className="text-xs text-green-600 text-right font-medium">
                  تم اختيار: {users.find(u => u.id === selectedUserId)?.full_name || 'مستخدم'}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>إلغاء</Button>
            <Button onClick={handleReassign} disabled={reassignLoading || !selectedUserId}>
              {reassignLoading ? 'جاري التحويل...' : 'تأكيد التحويل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
