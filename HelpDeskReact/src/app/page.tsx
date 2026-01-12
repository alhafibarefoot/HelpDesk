import { createClient } from "@/lib/supabase";
import { EnhancedServiceCard } from "@/components/enhanced-service-card";
import { MainNav } from "@/components/main-nav";
import { UserAIAssistant } from "@/components/user-ai-assistant";
import { Service } from "@/types";
import { Search, Sparkles, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function Home() {
  const supabase = createClient();

  // Fetch real services from database
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name");

  // No fallback mock data - show empty state if no services
  const displayServices: Service[] = services || [];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <MainNav />

      <main>
        {/* Hero Section - Clean Blue */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] via-[#DBEAFE] to-[#BFDBFE]">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-3">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ECC94B' fill-opacity='1'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          {/* Floating Blue Accents */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#93C5FD]/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#FCD34D]/20 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 py-24 relative">
            <div className="max-w-5xl mx-auto text-center">
              {/* Premium Badge */}
              <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full mb-8 border border-[#BFDBFE] shadow-sm">
                <Sparkles className="w-5 h-5 text-[#FBBF24]" />
                <span className="text-sm font-semibold text-[#3B82F6]">المؤسسة الملكية للأعمال الإنسانية</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
                <span className="block mb-2 text-[#111827]">منصة</span>
                <span className="block text-[#3B82F6]">
                  خدمات بلس
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-[#4B5563] mb-12 max-w-3xl mx-auto leading-relaxed">
                منصة متكاملة لخدمات الموظفين
                <br />
                <span className="text-[#3B82F6] font-semibold">سهولة • سرعة • كفاءة</span>
              </p>

              {/* Premium AI Assistant CTA */}
              <Link
                href="/ai-assistant"
                className="inline-flex items-center gap-4 bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:from-[#2563EB] hover:to-[#3B82F6] text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-16"
              >
                <Sparkles className="w-7 h-7" />
                جرّب المساعد الذكي
                <span className="text-sm font-normal opacity-90">مدعوم بالذكاء الاصطناعي</span>
              </Link>

              {/* Premium Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
                <div className="bg-white backdrop-blur-md rounded-2xl p-6 border border-[#E5E7EB] hover:border-[#93C5FD] transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md">
                  <div className="text-5xl font-bold mb-2 text-[#3B82F6]">
                    {displayServices.length}+
                  </div>
                  <div className="text-sm text-[#6B7280] font-medium">خدمة متاحة</div>
                </div>
                <div className="bg-white backdrop-blur-md rounded-2xl p-6 border border-[#E5E7EB] hover:border-[#93C5FD] transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md">
                  <div className="text-5xl font-bold mb-2 text-[#3B82F6]">
                    24/7
                  </div>
                  <div className="text-sm text-[#6B7280] font-medium">دعم متواصل</div>
                </div>
                <div className="bg-white backdrop-blur-md rounded-2xl p-6 border border-[#E5E7EB] hover:border-[#93C5FD] transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md">
                  <div className="text-5xl font-bold mb-2 text-[#3B82F6]">
                    4.5
                  </div>
                  <div className="text-sm text-[#6B7280] font-medium">ساعة متوسط الاستجابة</div>
                </div>
              </div>
            </div>
          </div>

          {/* Royal Wave Separator */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="rgb(249, 250, 251)" />
            </svg>
          </div>
        </section>

        {/* AI Assistant Section - Moved to /ai-assistant page */}
        {/* <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <UserAIAssistant
              services={displayServices}
              onRequestCreated={(requestId) => {
                // Optionally redirect to the request page
                console.log('Request created:', requestId);
              }}
            />
          </div>
        </section> */}

        {/* Services Section - Official RHF Colors */}
        <section className="container mx-auto px-4 py-20">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C9A961]/10 to-[#E5D4A6]/10 px-6 py-2 rounded-full mb-6 border border-[#C9A961]/20">
              <span className="text-sm font-semibold text-[#E30613]">خدماتنا</span>
            </div>
            <h2 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#E30613] via-[#FF1F2D] to-[#E30613] bg-clip-text text-transparent">
                الخدمات المتاحة
              </span>
            </h2>
            <p className="text-xl text-[#1F2937] max-w-3xl mx-auto leading-relaxed">
              اختر الخدمة المناسبة لك واستمتع بتجربة استثنائية
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {displayServices.map((service) => (
              <EnhancedServiceCard key={service.id} service={service} />
            ))}
          </div>

          {/* Empty State */}
          {displayServices.length === 0 && (
            <div className="text-center py-20 bg-gradient-to-br from-white to-[#E5D4A6]/10 rounded-3xl border-2 border-[#C9A961]/20 shadow-xl">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-[#C9A961]/20 to-[#E5D4A6]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-[#C9A961]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  لا توجد خدمات متاحة حالياً
                </h3>
                <p className="text-gray-500">
                  يرجى المحاولة مرة أخرى لاحقاً
                </p>
              </div>
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 mb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                هل أنت مسؤول؟
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                قم بإدارة الخدمات وتصميم سير العمل باستخدام المساعد الذكي
              </p>
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                الذهاب إلى لوحة التحكم
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
