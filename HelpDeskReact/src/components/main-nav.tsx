import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { createClient } from "@/lib/supabase-server" // Correct server client
import { Sparkles, Plus, Home, FileText, LayoutDashboard, Settings, ChevronDown, User, CheckSquare, Bell, LogOut } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export async function MainNav() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-50 shadow-sm">
            <div className="w-full flex h-20 items-center justify-between px-6">
                <div className="flex items-center gap-8">
                    {/* Services Plus Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105">
                            <Plus className="w-7 h-7 text-white" strokeWidth={3} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-[#111827]">
                                خدمات بلس
                            </span>
                            <span className="text-xs text-[#6B7280] font-medium">
                                المؤسسة الملكية للأعمال الإنسانية
                            </span>
                        </div>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="hidden lg:flex items-center gap-1">
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 text-sm font-semibold text-[#374151] hover:text-[#3B82F6] hover:bg-[#EFF6FF] rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            لوحة الملخص
                        </Link>

                        <Link
                            href="/dashboard/user/requests"
                            className="px-4 py-2 text-sm font-semibold text-[#374151] hover:text-[#3B82F6] hover:bg-[#EFF6FF] rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            طلباتي
                        </Link>

                        <Link
                            href="/dashboard/inbox"
                            className="px-4 py-2 text-sm font-semibold text-[#374151] hover:text-[#3B82F6] hover:bg-[#EFF6FF] rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                            <CheckSquare className="w-4 h-4" />
                            الموافقات
                        </Link>

                        <Link
                            href="/ai-assistant"
                            className="px-4 py-2 text-sm font-semibold text-[#374151] hover:text-[#3B82F6] hover:bg-[#EFF6FF] rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            المساعد الذكي
                        </Link>

                        {/* Admin Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="px-4 py-2 text-sm font-semibold text-[#374151] hover:text-[#3B82F6] hover:bg-[#EFF6FF] rounded-lg transition-all duration-200 flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    الإدارة
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-white border-[#E5E7EB]">
                                <DropdownMenuLabel className="text-[#111827]">لوحة التحكم</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[#E5E7EB]" />

                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/admin" className="flex items-center gap-2 cursor-pointer">
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>لوحة المسؤول</span>
                                    </Link>
                                </DropdownMenuItem>



                                <DropdownMenuSeparator className="bg-[#E5E7EB]" />
                                <DropdownMenuLabel className="text-[#111827]">إدارة الخدمات</DropdownMenuLabel>

                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/admin/services" className="flex items-center gap-2 cursor-pointer">
                                        <FileText className="w-4 h-4" />
                                        <span>الخدمات</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/admin/workflows" className="flex items-center gap-2 cursor-pointer">
                                        <Settings className="w-4 h-4" />
                                        <span>سير العمل</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/admin/users" className="flex items-center gap-2 cursor-pointer">
                                        <User className="w-4 h-4" />
                                        <span>المستخدمين</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </nav>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <NotificationBell />

                            {/* User Avatar with Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center gap-3 cursor-pointer group">
                                        <div className="hidden md:flex flex-col items-end">
                                            <span className="text-sm font-semibold text-[#111827]">{user.email?.split('@')[0]}</span>
                                            <span className="text-xs text-[#6B7280]">موظف</span>
                                        </div>
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105">
                                            <span className="text-white font-bold text-sm">
                                                {user.email?.[0].toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-white border-[#E5E7EB]">
                                    <DropdownMenuLabel className="text-[#111827]">حسابي</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-[#E5E7EB]" />

                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard" className="cursor-pointer flex items-center gap-2">
                                            <LayoutDashboard className="w-4 h-4" />
                                            لوحة التحكم
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/settings/notifications" className="cursor-pointer flex items-center gap-2">
                                            <Bell className="w-4 h-4" />
                                            تفضيلات الإشعارات
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="bg-[#E5E7EB]" />

                                    {/* Sign Out Logic would be client side, but for now just link or form */}
                                    <form action="/auth/signout" method="post">
                                        <DropdownMenuItem className="text-red-600 cursor-pointer flex items-center gap-2" asChild>
                                            <button type="submit" className="w-full text-right flex items-center gap-2">
                                                <LogOut className="w-4 h-4" />
                                                تسجيل الخروج
                                            </button>
                                        </DropdownMenuItem>
                                    </form>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <Link href="/login">
                            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                                تسجيل الدخول
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header >
    )
}
