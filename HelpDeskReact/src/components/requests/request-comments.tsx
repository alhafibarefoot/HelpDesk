'use client';

import { useState, useRef, useEffect } from 'react';
import { RequestComment } from '@/types';
import { addRequestComment, getRequestComments } from '@/app/actions/comments';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { MessageSquare, Send, AtSign } from 'lucide-react';
import { cn } from "@/lib/utils";

interface RequestCommentsProps {
    requestId: string;
    initialComments?: RequestComment[];
    currentUserEmail?: string;
}

export function RequestComments({ requestId, initialComments = [], currentUserEmail }: RequestCommentsProps) {
    const [comments, setComments] = useState<RequestComment[]>(initialComments);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refresh comments
    const refreshComments = async () => {
        const updated = await getRequestComments(requestId);
        if (updated) setComments(updated as any);
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await addRequestComment(requestId, newComment);
            setNewComment("");
            await refreshComments();
        } catch (error) {
            console.error("Failed to add comment", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Initial fetch if empty
    useEffect(() => {
        if (initialComments.length === 0) {
            refreshComments();
        }
    }, [requestId]);

    return (
        <Card className="mt-6 border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-gray-50/50">
                <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    التعليقات والمناقشات
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full mr-auto">
                        {comments.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {/* Comment List */}
                <div className="max-h-[500px] overflow-y-auto p-4 space-y-6">
                    {comments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            لا توجد تعليقات حتى الآن.
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4 items-start">
                                <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                                    <AvatarImage src={comment.user?.avatar_url} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                        {comment.user?.full_name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-gray-900">
                                                {comment.user?.full_name}
                                            </span>
                                            <span className="text-xs text-gray-500" dir="ltr">
                                                {comment.user?.email}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: enGB })}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg rounded-tr-none p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {highlightMentions(comment.content)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-50/50 border-t">
                    <div className="relative">
                        <Textarea
                            placeholder="اكتب تعليقاً... (استخدم @ للإشارة للمستخدمين)"
                            className="w-full min-h-[100px] bg-white resize-y pl-12"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            <Button
                                size="sm"
                                className="h-8 w-8 rounded-full p-0"
                                variant="ghost"
                                title="إشارة لمستخدم (@)"
                                onClick={() => setNewComment(prev => prev + "@")}
                            >
                                <AtSign className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !newComment.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isSubmitting ? "..." : <Send className="w-4 h-4" />}
                                <span className="sr-only">إرسال</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper to highlight @mentions
function highlightMentions(text: string) {
    // Split by spaces to find potential mentions
    // Simple heuristic: words starting with @
    const parts = text.split(/(\s+)/);
    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            return <span key={i} className="text-blue-600 font-semibold bg-blue-50 px-1 rounded mx-0.5">{part}</span>;
        }
        return part;
    });
}
