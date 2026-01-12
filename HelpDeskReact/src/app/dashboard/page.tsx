
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Bell,
  ArrowRight,
  Clock,
  CheckCircle2
} from "lucide-react";

export default async function OverviewPage() {
  const supabase = await createClient();

  // 1. Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Get User Profile (Role)
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // 3. Parallel Data Fetching
  const userRole = userProfile?.role;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queries = [
    // A) My Requests - Total
    supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id),

    // B) My Requests - Active
    supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .not('status', 'in', '("مكتمل","مرفوض")'),

    // C) My Requests - Completed Today (Check updated_at >= today start)
    supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .eq('status', 'مكتمل')
      .gte('updated_at', today.toISOString()),

    // D) Unread Notifications
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  ];

  // E) My Approvals (if role exists)
  let pendingApprovalsPromise = Promise.resolve({ count: 0, error: null });
  if (userRole) {
    pendingApprovalsPromise = supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_role', userRole)
      .not('status', 'in', '("مكتمل","مرفوض")') as any;
  }

  const [
    totalRequestsRes,
    activeRequestsRes,
    completedTodayRes,
    notificationsRes,
    approvalsRes
  ] = await Promise.all([...queries, pendingApprovalsPromise]);

  const metrics = {
    totalRequests: totalRequestsRes.count || 0,
    activeRequests: activeRequestsRes.count || 0,
    completedToday: completedTodayRes.count || 0,
    unreadNotifications: notificationsRes.count || 0,
    pendingApprovals: approvalsRes.count || 0
  };

  return (
    <div className="container mx-auto py-8 px-4" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-blue-600" />
          لوحة الملخص
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          نظرة سريعة على طلباتك والموافقات المعلقة.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* 1. My Requests Card */}
        <Card className="shadow-sm border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-700 flex justify-between items-center">
              <span>طلباتي</span>
              <FileText className="h-5 w-5 text-blue-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-4xl font-bold text-gray-900">
                  {metrics.totalRequests}
                </div>
                <div className="text-sm text-gray-500 mt-1">إجمالي الطلبات</div>
              </div>
            </div>
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-600">
                  <Clock className="h-3 w-3" /> قيد التنفيذ
                </span>
                <span className="font-semibold text-yellow-600">{metrics.activeRequests}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-600">
                  <CheckCircle2 className="h-3 w-3" /> اكتمل اليوم
                </span>
                <span className="font-semibold text-green-600">{metrics.completedToday}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Approvals Card */}
        <Card className="shadow-sm border-t-4 border-t-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-700 flex justify-between items-center">
              <span>موافقاتي</span>
              <CheckSquare className="h-5 w-5 text-purple-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-4xl font-bold text-gray-900">
                  {metrics.pendingApprovals}
                </div>
                <div className="text-sm text-gray-500 mt-1">بانتظار الإجراء</div>
              </div>
            </div>
            <div className="pt-4 border-t min-h-[52px] flex items-center">
              {!userRole ? (
                <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                  لا توجد صلاحيات موافقة
                </span>
              ) : (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  بصفتك: {userRole}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Notifications Card */}
        <Card className="shadow-sm border-t-4 border-t-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-700 flex justify-between items-center">
              <span>الإشعارات</span>
              <Bell className="h-5 w-5 text-yellow-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-4xl font-bold text-gray-900">
                  {metrics.unreadNotifications}
                </div>
                <div className="text-sm text-gray-500 mt-1">غير مقروء</div>
              </div>
            </div>
            <div className="pt-4 border-t min-h-[52px] flex items-center">
              <div className="text-sm text-gray-500">
                ابق على اطلاع بآخر التحديثات
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/user/requests" className="w-full">
          <Button variant="outline" className="w-full h-auto py-4 justify-between group hover:border-blue-500 hover:bg-blue-50">
            <span className="flex items-center gap-2 font-semibold text-lg text-gray-700 group-hover:text-blue-700">
              <FileText className="h-5 w-5" />
              إدارة طلباتي
            </span>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transform group-hover:-translate-x-1 transition-transform" />
          </Button>
        </Link>

        <Link href="/dashboard/inbox" className="w-full">
          <Button variant="outline" className="w-full h-auto py-4 justify-between group hover:border-purple-500 hover:bg-purple-50">
            <span className="flex items-center gap-2 font-semibold text-lg text-gray-700 group-hover:text-purple-700">
              <CheckSquare className="h-5 w-5" />
              صندوق الموافقات
            </span>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transform group-hover:-translate-x-1 transition-transform" />
          </Button>
        </Link>

        <Link href="/dashboard/notifications" className="w-full">
          <Button variant="outline" className="w-full h-auto py-4 justify-between group hover:border-yellow-500 hover:bg-yellow-50">
            <span className="flex items-center gap-2 font-semibold text-lg text-gray-700 group-hover:text-yellow-700">
              <Bell className="h-5 w-5" />
              مركز الإشعارات
            </span>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-yellow-500 transform group-hover:-translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
