
import { DragEvent } from 'react';
import { PlayCircle, Square, GitBranch, StopCircle, GripVertical } from 'lucide-react';

export function NodePalette() {
    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/reactflow-label', label);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-64 bg-white border-l border-gray-200 flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">أدوات التصميم</h2>
                <p className="text-xs text-gray-500 mt-1">اسحب العناصر للمساحة</p>
            </div>

            <div className="p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">العقد الأساسية</div>

                <div
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-500 hover:shadow-sm transition-all shadow-sm"
                    onDragStart={(event) => onDragStart(event, 'start', 'البداية')}
                    draggable
                >
                    <PlayCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">البداية (Start)</span>
                </div>

                <div
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-500 hover:shadow-sm transition-all shadow-sm"
                    onDragStart={(event) => onDragStart(event, 'task', 'مهمة جديدة')}
                    draggable
                >
                    <Square className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium">مهمة (Task)</span>
                </div>

                <div
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-500 hover:shadow-sm transition-all shadow-sm"
                    onDragStart={(event) => onDragStart(event, 'gateway', 'بوابة')}
                    draggable
                >
                    <GitBranch className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">بوابة شرطية (Gateway)</span>
                </div>

                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">التوازي (Parallel)</div>

                <div
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-orange-500 hover:shadow-sm transition-all shadow-sm"
                    onDragStart={(event) => onDragStart(event, 'parallel_fork', 'تفرع متوازي')}
                    draggable
                >
                    <GitBranch className="w-5 h-5 text-orange-600 rotate-90" />
                    <span className="text-sm font-medium">تفرع (Fork)</span>
                </div>

                <div
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-orange-500 hover:shadow-sm transition-all shadow-sm"
                    onDragStart={(event) => onDragStart(event, 'parallel_join', 'تجميع متوازي')}
                    draggable
                >
                    <GripVertical className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium">تجميع (Join)</span>
                </div>

                <div className="mt-4 border-t pt-2"></div>

                <div
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-500 hover:shadow-sm transition-all shadow-sm"
                    onDragStart={(event) => onDragStart(event, 'end', 'النهاية')}
                    draggable
                >
                    <StopCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium">النهاية (End)</span>
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50">
                <div className="text-xs text-gray-500 flex items-start gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                    <p>تأكد من وجود عقدة بداية واحدة وعقدة نهاية واحدة على الأقل.</p>
                </div>
            </div>
        </aside>
    );
}

function AlertTriangleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    )
}
