import React, { useState } from 'react';
import { MessageSquare, Send, Paperclip, Lock, Globe, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface Comment {
    id: string;
    comment_text: string;
    is_internal: boolean;
    author_name: string;
    author_role?: string;
    attachments?: Array<{
        filename: string;
        url: string;
        size: number;
        type: string;
    }>;
    created_at: string;
    updated_at?: string;
    is_deleted: boolean;
}

interface RequestCommentsProps {
    requestId: string;
    comments: Comment[];
    onAddComment: (text: string, isInternal: boolean) => Promise<void>;
    onDeleteComment?: (commentId: string) => Promise<void>;
    className?: string;
}

export function RequestComments({
    requestId,
    comments,
    onAddComment,
    onDeleteComment,
    className
}: RequestCommentsProps) {
    const [newComment, setNewComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onAddComment(newComment, isInternal);
            setNewComment('');
            setIsInternal(false);
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('فشل إضافة التعليق');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    التعليقات ({comments.filter(c => !c.is_deleted).length})
                </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
                {comments.filter(c => !c.is_deleted).map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        onDelete={onDeleteComment}
                    />
                ))}

                {comments.filter(c => !c.is_deleted).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد تعليقات بعد</p>
                    </div>
                )}
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleSubmit} className="border-t pt-4">
                <div className="space-y-3">
                    <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="اكتب تعليقك هنا... (استخدم @ لذكر شخص)"
                        className="min-h-[100px] resize-none"
                        disabled={isSubmitting}
                    />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Internal/Public Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsInternal(!isInternal)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                                    isInternal
                                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                                )}
                            >
                                {isInternal ? (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        <span>داخلي</span>
                                    </>
                                ) : (
                                    <>
                                        <Globe className="w-4 h-4" />
                                        <span>عام</span>
                                    </>
                                )}
                            </button>

                            {/* Attachment Button (placeholder) */}
                            <button
                                type="button"
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                title="إرفاق ملف"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>
                        </div>

                        <Button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <span>جاري الإرسال...</span>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    إرسال
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

interface CommentItemProps {
    comment: Comment;
    onDelete?: (commentId: string) => Promise<void>;
}

function CommentItem({ comment, onDelete }: CommentItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!onDelete || !confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

        setIsDeleting(true);
        try {
            await onDelete(comment.id);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('فشل حذف التعليق');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={cn(
            'bg-white border rounded-lg p-4 shadow-sm',
            comment.is_internal && 'border-orange-200 bg-orange-50'
        )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {comment.author_name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{comment.author_name}</span>
                            {comment.author_role && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    {comment.author_role}
                                </span>
                            )}
                            {comment.is_internal && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    داخلي
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-500">
                            {formatTimeAgo(comment.created_at)}
                        </span>
                    </div>
                </div>

                {onDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="حذف التعليق"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="text-gray-700 whitespace-pre-wrap mb-2">
                {comment.comment_text}
            </div>

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                    {comment.attachments.map((file, index) => (
                        <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                        >
                            <Paperclip className="w-4 h-4" />
                            <span className="font-medium">{file.filename}</span>
                            <span className="text-xs text-gray-500">
                                ({formatFileSize(file.size)})
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;

    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}
