"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { WorkflowDefinition, FormSchema } from '@/types';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ServiceAssistantChatProps {
    serviceName: string;
    currentWorkflow: WorkflowDefinition;
    currentForm: FormSchema | undefined; // Form might be missing initially
    onUpdate: (updates: { workflow?: WorkflowDefinition; form?: FormSchema; message: string }) => void;
}

export function ServiceAssistantChat({ serviceName, currentWorkflow, currentForm, onUpdate }: ServiceAssistantChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: `أهلاً بك في مساعد ${serviceName}. أطلب مني تعديل النموذج أو سير العمل، مثلاً: "أضف حقل رقم الهاتف" أو "اجعل الموافقة تتطلب مدير القسم".` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/refine-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: input,
                    currentWorkflow,
                    currentForm: currentForm || { fields: [] }, // Ensure form exists
                    serviceName,
                    mode: 'refine'
                }),
            });

            if (!response.ok) throw new Error('Failed to connect to AI');

            const data = await response.json();

            const assistantMsg: Message = {
                role: 'assistant',
                content: data.message || "تم تحديث الخدمة بناءً على طلبك."
            };

            setMessages(prev => [...prev, assistantMsg]);

            // Notify parent to update state
            onUpdate({
                workflow: data.workflow,
                form: data.form,
                message: data.message
            });

        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "عذراً، حدث خطأ أثناء المعالجة." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold">المساعد الذكي</h3>
                </div>
                <p className="text-xs text-blue-100 mt-1">يساعدك في تعديل الخدمة الحالية</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border text-gray-800 shadow-sm'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm p-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري التفكير...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="اكتب التعديل المطلوب..."
                        className="min-h-[50px] max-h-[100px] resize-none"
                    />
                    <Button type="submit" disabled={isLoading} size="icon" className="h-[50px] w-[50px] shrink-0">
                        <Send className="w-5 h-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
