import { ChatMessage } from '@/lib/ai-workflow-refiner';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import dynamic from 'next/dynamic';

const WorkflowPreview = dynamic(() => import('./workflow-preview'), {
    ssr: false,
});

interface ChatMessageProps {
    message: ChatMessage;
}

export function ChatMessageComponent({ message }: ChatMessageProps) {
    const isUser = message.sender === 'user';

    return (
        <div className={cn(
            "flex gap-3 mb-4",
            isUser ? "justify-end" : "justify-start"
        )}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-600" />
                </div>
            )}

            <div className={cn(
                "max-w-[70%] space-y-2",
                isUser && "flex flex-col items-end"
            )}>
                <div className={cn(
                    "rounded-lg px-4 py-2",
                    isUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                )}>
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>

                {message.workflow && !isUser && (
                    <div className="w-full">
                        <WorkflowPreview workflow={message.workflow} />
                    </div>
                )}

                <span className="text-xs text-gray-500">
                    {format(message.timestamp, 'HH:mm', { locale: ar })}
                </span>
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                </div>
            )}
        </div>
    );
}
