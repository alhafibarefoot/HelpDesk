"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isSignUp) {
                // Register Logic
                 const response = await fetch('https://localhost:7229/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, fullName: email.split('@')[0] })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "فشل إنشاء الحساب");
                }

                // Store Token
                 document.cookie = `token=${data.token}; path=/; max-age=604800; Secure; SameSite=Strict`;
                 router.push('/dashboard');
                 router.refresh();

            } else {
                // Login Logic
                const response = await fetch('https://localhost:7229/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json(); // Now this will parse correctly

                if (!response.ok) {
                    throw new Error(data.message || "فشل تسجيل الدخول");
                }

                // Store Token
                document.cookie = `token=${data.token}; path=/; max-age=604800; Secure; SameSite=Strict`;
                localStorage.setItem('user', JSON.stringify(data.user));

                router.push('/dashboard');
                router.refresh();
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "حدث خطأ غير متوقع");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
            {/* Right Side - Form */}
            <div className="flex items-center justify-center p-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                            {isSignUp ? "إنشاء حساب جديد" : "تسجيل الدخول"}
                        </h2>
                        <p className="mt-2 text-gray-600">
                            مرحباً بك في منصة خدمات بلس
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">البريد الإلكتروني</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="text-right"
                                    dir="ltr"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">كلمة المرور</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="text-right"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">
                                {successMsg}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                isSignUp ? "إنشاء الحساب" : "دخول"
                            )}
                        </Button>
                    </form>

                    <div className="text-center text-sm">
                        <span className="text-gray-500">
                            {isSignUp ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟"}
                        </span>
                        {' '}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                            {isSignUp ? "تسجيل الدخول" : "إنشاء حساب تجريبي"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Left Side - Image/Decor */}
            <div className="hidden lg:flex relative bg-blue-600 items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 opacity-90" />
                <div className="relative z-10 p-12 text-white text-center max-w-lg">
                    <h1 className="text-4xl font-bold mb-6">منصة خدمات بلس</h1>
                    <p className="text-lg text-blue-100 leading-relaxed">
                        بوابتك الموحدة للوصول إلى كافة الخدمات الإدارية والتقنية.
                        أنجز معاملاتك بسرعة وسهولة، وتابع طلباتك لحظة بلحظة.
                    </p>
                </div>
                {/* Abstract Circles */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
