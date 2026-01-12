
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Clock } from "lucide-react";

export default async function ServiceCatalogPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch active services
    const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .in('status', ['active', 'maintenance']) // Show active and maintenance
        .order('name');

    if (error) {
        console.error("Error fetching services:", error);
    }

    return (
        <div className="container mx-auto py-8 px-4" dir="rtl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">دليل الخدمات</h1>
                <p className="text-gray-600">اختر الخدمة التي ترغب في تقديم طلب لها</p>
            </div>

            {!services || services.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                    <p className="text-gray-500">لا توجد خدمات متاحة حالياً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <Card key={service.id} className="hover:shadow-md transition-shadow flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    {service.status === 'maintenance' && (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                            تحت الصيانة
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-xl">{service.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-gray-500 text-sm line-clamp-3">
                                    {service.description || "لا يوجد وصف متاح للخدمة."}
                                </p>
                                {service.default_sla_hours > 0 && (
                                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        <span>مدة الإنجاز المتوقعة: {service.default_sla_hours} ساعة</span>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                {service.status === 'active' ? (
                                    <Link href={`/dashboard/services/${service.key}`} className="w-full">
                                        <Button className="w-full gap-2 group">
                                            تقديم طلب
                                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button disabled className="w-full bg-gray-100 text-gray-400">
                                        غير متاح حالياً
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
