import { AdminStatsCard } from "@/components/admin/admin-stats-card";
import { ServiceManagementCard } from "@/components/admin/service-management-card";
import { AdminRequestList } from "@/components/dashboard/admin-request-list";

import { Request, Service } from "@/types";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Settings,
  BarChart3,
  Search
} from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination-controls";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage(props: {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.q || '';
  const currentPage = Number(searchParams?.page) || 1;
  const ITEMS_PER_PAGE = 10;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = await createClient();

  // Fetch Services
  const { data: rawServices } = await supabase
    .from('services')
    .select('*')
    .order('name');

  const services = (rawServices || []).filter(s =>
    !s.name.includes('(مؤرشف)') &&
    s.status !== 'archived' &&
    s.status !== 'suspended'
  );

  // --- SEARCH LOGIC ---
  let matchingRequesterIds: string[] = [];

  // If there's a search term, try to find matching users first
  if (query) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${query}%`)
      .limit(50);

    if (profiles) {
      matchingRequesterIds = profiles.map(p => p.id);
    }
  }

  // Build Request Query
  const activeServiceIds = services.map(s => s.id);

  let requestQuery = supabase
    .from('requests')
    .select('*, service:services(*)', { count: 'exact' })
    .in('service_id', activeServiceIds);

  if (query) {
    const conditions = [`title.ilike.%${query}%`, `request_number.ilike.%${query}%`];
    if (matchingRequesterIds.length > 0) {
      // Supabase OR syntax with foreign table filter is tricky, so passing IDs effectively
      conditions.push(`requester_id.in.(${matchingRequesterIds.join(',')})`);
    }
    requestQuery = requestQuery.or(conditions.join(','));
  }

  // Fetch Paged Requests
  const { data: rawRequests, count } = await requestQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  // Fetch Profiles Manually (Manual Join)
  const requesterIds = Array.from(new Set(rawRequests?.map((r: any) => r.requester_id) || []));
  let profiles: any[] = [];

  if (requesterIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', requesterIds);
    profiles = profilesData || [];
  }

  // Fetch ALL profiles for Reassign Dropdown (limit to 500 for now)
  // Use Admin Client to bypass RLS and ensure we see everyone
  const adminSupabase = await createAdminClient();
  const { data: allUsers } = await adminSupabase
    .from('users') // Use 'users' view/table which seems to have the full list
    .select('id, full_name, email')
    .limit(500);

  // Merge Data


  // Fetch aggregated stats for services (lightweight)
  const { data: allRequestsData } = await supabase.from('requests').select('service_id, status');

  // Calculate per-service stats and Global Stats based ONLY on visible (non-archived) services
  const serviceStatsMap = new Map<string, { total: number; active: number }>();
  let computedTotal = 0;
  let computedPending = 0;
  let computedCompleted = 0;

  // Create a Set of visible service IDs for fast lookup
  const visibleServiceIds = new Set(services.map(s => s.id));

  (allRequestsData || []).forEach((r: any) => {
    // Only count requests if their service is visible (not archived)
    if (visibleServiceIds.has(r.service_id)) {
      // Global Stats
      computedTotal++;
      if (['جديد', 'قيد المراجعة', 'قيد التنفيذ', 'بانتظار الموافقة'].includes(r.status)) computedPending++;
      if (r.status === 'مكتمل') computedCompleted++;

      // Per Service Stats
      const current = serviceStatsMap.get(r.service_id) || { total: 0, active: 0 };
      current.total += 1;
      if (['جديد', 'قيد المراجعة', 'قيد التنفيذ', 'بانتظار الموافقة'].includes(r.status)) {
        current.active += 1;
      }
      serviceStatsMap.set(r.service_id, current);
    }
  });

  // Fetch Active Tasks for these specific requests to show "Pending With" and "Duration"
  const requestIds = (rawRequests || []).map((r: any) => r.id);
  let requestTasksMap: Record<string, any> = {};

  if (requestIds.length > 0) {
    const { data: activeTasks } = await adminSupabase
      .from('workflow_tasks')
      .select('request_id, assigned_to_user, assigned_to_role, created_at')
      .in('request_id', requestIds)
      .eq('status', 'pending');

    if (activeTasks) {
      activeTasks.forEach((t: any) => {
        // We take the first pending task we find for the request
        if (!requestTasksMap[t.request_id]) {
          requestTasksMap[t.request_id] = t;
        }
      });
    }
  }

  // Merge Data
  const requests = (rawRequests || []).map((r: any) => {
    const activeTask = requestTasksMap[r.id];
    let pendingWith = '-';
    let pendingSince = r.created_at; // Default to request creation

    if (activeTask) {
      pendingSince = activeTask.created_at;
      if (activeTask.assigned_to_user) {
        const u = (allUsers || []).find((u: any) => u.id === activeTask.assigned_to_user);
        pendingWith = u ? u.full_name : 'مستخدم (غير معروف)';
      } else if (activeTask.assigned_to_role) {
        pendingWith = activeTask.assigned_to_role; // e.g. "مدير"
      }
    } else {
      // Fallback for requests without tasks but still active
      if (['جديد', 'قيد المراجعة'].includes(r.status)) pendingWith = 'النظام';
    }

    return {
      ...r,
      pendingWith,
      pendingSince,
      requester: profiles.find((p: any) => p.id === r.requester_id) || {
        id: r.requester_id,
        full_name: 'مستخدم غير معروف',
        email: '',
        role: 'employee'
      }
    }
  });

  const totalServices = services?.length || 0;

  return (
    <>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-gray-50 pb-64">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">لوحة تحكم المسؤول</h1>
                <p className="text-gray-600">إدارة الخدمات والطلبات والمستخدمين</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/dashboard/admin/ai-assistant">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all cursor-pointer">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-semibold">المساعد الذكي</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AdminStatsCard
              title="إجمالي الطلبات"
              value={computedTotal}
              icon={FileText}
              color="blue"
              trend={{ value: 12, label: "من الشهر الماضي" }}
            />
            <AdminStatsCard
              title="قيد المعالجة"
              value={computedPending}
              icon={Clock}
              color="orange"
            />
            <AdminStatsCard
              title="المكتملة"
              value={computedCompleted}
              icon={CheckCircle2}
              color="green"
              trend={{ value: 8, label: "من الشهر الماضي" }}
            />
            <AdminStatsCard
              title="الخدمات النشطة"
              value={totalServices}
              icon={Settings}
              color="purple"
            />
          </div>

          {/* AI Assistant Banner */}
          <div className="mb-8">
            <Link href="/dashboard/admin/ai-assistant">
              <div className="relative overflow-hidden bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#93C5FD] rounded-2xl p-8 hover:shadow-2xl transition-all cursor-pointer group">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }} />
                </div>

                <div className="relative flex items-center gap-6">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">إنشاء خدمة بالذكاء الاصطناعي</h2>
                    <p className="text-purple-100">
                      صف الخدمة التي تريدها، والمساعد الذكي سيبني المخطط والنموذج تلقائياً في ثوانٍ
                    </p>
                  </div>
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Services Management */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">إدارة الخدمات</h2>
                <p className="text-gray-600">تعديل وإدارة سير العمل للخدمات</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BarChart3 className="w-4 h-4" />
                <span>{totalServices} خدمة</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services?.map((service) => {
                const stats = serviceStatsMap.get(service.id) || { total: 0, active: 0 };
                return (
                  <ServiceManagementCard
                    key={service.id}
                    service={service}
                    stats={{
                      totalRequests: stats.total,
                      activeRequests: stats.active,
                      avgCompletionTime: `${service.default_sla_hours} ساعة`
                    }}
                  />
                );
              })}

              {(!services || services.length === 0) && (
                <div className="col-span-full">
                  <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      لا توجد خدمات مضافة
                    </h3>
                    <p className="text-gray-500 mb-6">
                      ابدأ بإنشاء خدمة جديدة باستخدام المساعد الذكي
                    </p>
                    <Link href="/dashboard/admin/ai-assistant">
                      <div className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors">
                        <Sparkles className="w-5 h-5" />
                        إنشاء خدمة جديدة
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Requests */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">الطلبات الحديثة</h2>
                <p className="text-gray-600">آخر الطلبات المقدمة من المستخدمين</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{computedTotal} طلب</span>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <SearchInput placeholder="بحث برقم الطلب، العنوان، أو اسم الموظف..." />
            </div>

            <AdminRequestList requests={requests || []} users={allUsers || []} />

            <div className="mt-6">
              <Pagination totalPages={totalPages} currentPage={currentPage} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
