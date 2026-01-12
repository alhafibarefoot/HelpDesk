import { MainNav } from "@/components/main-nav";
import Link from "next/link";
import { FileText, LayoutDashboard, LogOut, Settings } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
            {/* Top Navbar */}
            <MainNav />

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 container mx-auto">
                {children}
            </main>
        </div>
    );
}
