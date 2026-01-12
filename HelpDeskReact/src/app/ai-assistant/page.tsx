import { createClient } from "@/lib/supabase";
import { UserAIAssistant } from "@/components/user-ai-assistant";
import { MainNav } from "@/components/main-nav";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function AIAssistantPage() {
    const supabase = createClient();

    // Fetch services
    const { data: services, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");

    if (error) {
        console.error("Error fetching services:", error);
    }

    console.log("Services found:", services?.length);

    if (!services || services.length === 0) {
        console.log("No services found.");
        // redirect("/"); // Don't redirect, let it show empty state
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
            <MainNav />

            <main className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                    >
                        <ArrowRight className="w-4 h-4" />
                        العودة للرئيسية
                    </Link>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">المساعد الذكي</h1>
                            <p className="text-lg text-gray-600 mt-1">
                                اكتب طلبك بلغة طبيعية وسأقوم بإنشائه لك تلقائياً
                            </p>
                        </div>
                    </div>
                </div>

                {/* AI Assistant */}
                <div className="max-w-4xl mx-auto">
                    {services && services.length > 0 ? (
                        <UserAIAssistant
                            services={services.map(s => ({
                                ...s,
                                form_schema: s.form_schema || { fields: [] }
                            }))}
                        />
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد خدمات متاحة حالياً</h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                يبدو أنه لم يتم إضافة أي خدمات للنظام بعد. يرجى التواصل مع المسؤول لإضافة الخدمات.
                            </p>
                            <Link href="/">
                                <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                    العودة للرئيسية
                                </div>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Info Cards */}
                <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm">
                        <div className="text-3xl mb-2">🎯</div>
                        <h3 className="font-bold text-gray-900 mb-2">دقيق وسريع</h3>
                        <p className="text-sm text-gray-600">
                            يفهم طلبك ويستخرج جميع التفاصيل تلقائياً
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm">
                        <div className="text-3xl mb-2">✨</div>
                        <h3 className="font-bold text-gray-900 mb-2">ذكي ومرن</h3>
                        <p className="text-sm text-gray-600">
                            يختار الخدمة المناسبة ويملأ النموذج بذكاء
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm">
                        <div className="text-3xl mb-2">🚀</div>
                        <h3 className="font-bold text-gray-900 mb-2">سهل الاستخدام</h3>
                        <p className="text-sm text-gray-600">
                            فقط اكتب ما تريد بلغتك الطبيعية
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
