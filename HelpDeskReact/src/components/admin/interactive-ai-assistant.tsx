"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles, Save, RotateCcw, Maximize2, Minimize2, Edit3 } from 'lucide-react';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import WorkflowPreview from './workflow-preview';
import { WorkflowDefinition, FormSchema, FieldDefinition } from '@/types';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StartNode, EndNode, ApprovalNode, ActionNode, GatewayNode, JoinNode, SubWorkflowNode } from './flow/custom-nodes';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    image?: string | null;
    workflow?: WorkflowDefinition;
    form?: FormSchema;
}

const nodeTypes = {
    start: StartNode,
    end: EndNode,
    approval: ApprovalNode,
    action: ActionNode,
    gateway: GatewayNode,
    join: JoinNode,
    subworkflow: SubWorkflowNode,
};

interface InteractiveAIAssistantProps {
    initialData?: {
        serviceId: string;
        serviceName: string;
        serviceKey: string;
        workflow: WorkflowDefinition;
        form: FormSchema;
    };
}

export default function InteractiveAIAssistant({ initialData }: InteractiveAIAssistantProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(initialData?.workflow || null);
    const [currentForm, setCurrentForm] = useState<FormSchema | null>(initialData?.form || null);
    const [serviceName, setServiceName] = useState(initialData?.serviceName || '');
    const [serviceKey, setServiceKey] = useState(initialData?.serviceKey || '');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isManualEdit, setIsManualEdit] = useState(false);
    const [activeView, setActiveView] = useState<'workflow' | 'form' | 'schema'>('workflow');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // ReactFlow states for manual editing
    const initialNodes = initialData?.workflow?.nodes?.map((node, index) => ({
        ...node,
        id: node.id || `node-${index}-${Date.now()}`,
        position: node.position || { x: 250, y: 50 + (index * 150) }
    })) || [];

    const initialEdges = initialData?.workflow?.edges?.map((edge, index) => ({
        ...edge,
        id: `assist-edge-${index}-${Date.now()}`
    })) || [];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Ensure state is synced with initialData
    useEffect(() => {
        if (initialData) {
            console.log('[InteractiveAIAssistant] Initializing with data:', initialData);
            if (initialData.workflow) {
                setCurrentWorkflow(initialData.workflow);
                const newNodes = initialData.workflow.nodes?.map((node, index) => ({
                    ...node,
                    id: node.id || `node-${index}-${Date.now()}`,
                    position: node.position || { x: 250, y: 50 + (index * 150) }
                })) || [];
                setNodes(newNodes);
                const newEdges = initialData.workflow.edges?.map((edge, index) => ({
                    ...edge,
                    id: `assist-edge-${index}-${Date.now()}`
                })) || [];
                setEdges(newEdges);
            }
            if (initialData.form) setCurrentForm(initialData.form);
            if (initialData.serviceName) setServiceName(initialData.serviceName);
            if (initialData.serviceKey) setServiceKey(initialData.serviceKey);
            if (messages.length === 0) {
                setMessages([{
                    role: 'assistant',
                    content: `أهلاً بك! لقد قمت بتحميل خدمة "${initialData.serviceName}". يمكنك الآن طلب تعديلات عليها مثل "أضف خطوة موافقة" أو "عدل النموذج".`
                }]);
            }
        }
    }, [initialData]);

    const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

    const evalVis = (field: FieldDefinition) => {
        // 1. Check if 'hidden' is explicitly set to true
        if (field.hidden === true) return false;

        // 2. Support string-based conditions ('show_if' or 'condition')
        const conditionStr = (field as any).show_if || (field as any).condition;
        if (conditionStr && typeof conditionStr === 'string') {
            // Simple string parser for common AI patterns: "field == 'value'" or "field == value"
            // Handles both = and ==/===, and != / !==
            const match = conditionStr.match(/(\w+)\s*(=|==|===|!=|!==)\s*['"]?([^'"]+)['"]?/);
            if (match) {
                const [_, ifField, operator, expectedValue] = match;
                const targetValue = previewValues[ifField];

                console.log(`[evalVis] Checking string condition: ${field.key}`, { ifField, operator, expectedValue, targetValue });

                if (operator.includes('=')) {
                    if (operator.startsWith('!')) return String(targetValue) !== String(expectedValue);
                    return String(targetValue) === String(expectedValue);
                }
            }
        }

        // 3. Support both 'rules' and 'conditions' (AI sometimes confuses them)
        const logicRules = field.rules || (field as any).conditions;

        if (logicRules && Array.isArray(logicRules) && logicRules.length > 0) {
            const isVisible = logicRules.every((rule: any) => {
                // Determine the trigger field key (support 'ifField' or 'field')
                const ifField = rule.ifField || rule.field;
                if (!ifField) return true;

                const targetValue = previewValues[ifField];
                const operator = rule.operator;
                const expectedValue = rule.value;

                console.log(`[evalVis] Checking ${field.key} depends on ${ifField}:`, {
                    current: targetValue,
                    expected: expectedValue,
                    op: operator
                });

                // Resilient operator check with string coercion
                if (operator === 'eq' || operator === '==' || operator === '===') {
                    return String(targetValue) === String(expectedValue);
                }
                if (operator === 'neq' || operator === '!=' || operator === '!==') {
                    return String(targetValue) !== String(expectedValue);
                }

                return true;
            });
            return isVisible;
        }

        return true; // Default to visible
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !selectedImage) || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input || (selectedImage ? 'تحليل الصورة المرفقة' : ''),
            image: selectedImage
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setSelectedImage(null);
        setIsLoading(true);

        try {
            // Determine if we are creating new or refining existing
            const endpoint = currentWorkflow ? '/api/refine-workflow' : '/api/generate-service';

            const body = currentWorkflow
                ? {
                    command: input,
                    currentWorkflow,
                    currentForm,
                    serviceName,
                    mode: 'refine'
                }
                : {
                    description: input,
                    image: selectedImage, // Pass image
                    conversationHistory: messages
                };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'فشل في الاتصال بالمساعد');
            }

            const data = await response.json();

            // Calculate diff/change summary if needed, for now just use the message from AI
            const aiContent = data.message || data.explanation || (currentWorkflow ? 'تم تحديث المخطط' : 'تم إنشاء المخطط');

            const assistantMessage: Message = {
                role: 'assistant',
                content: aiContent,
                workflow: data.workflow,
                form: data.form
            };

            setMessages(prev => [...prev, assistantMessage]);
            setCurrentWorkflow(data.workflow);
            setCurrentForm(data.form);
            if (data.serviceName) setServiceName(data.serviceName);

            // Only update serviceKey if this is a NEW service
            // If we are editing an existing service (initialData exists), we must preserve the key
            if (data.serviceKey && !initialData?.serviceKey) {
                setServiceKey(data.serviceKey);
            } else if (initialData?.serviceKey) {
                // Ensure we keep the original key
                setServiceKey(initialData.serviceKey);
            }

            // Update ReactFlow nodes/edges for manual editing
            if (data.workflow) {
                const nodesWithPositions = data.workflow.nodes.map((node: Node, index: number) => ({
                    ...node,
                    id: node.id || `node-${index}-${Date.now()}`,
                    position: node.position || { x: 250, y: 50 + (index * 150) }
                }));
                const edgesWithIds = data.workflow.edges.map((edge: Edge, index: number) => ({
                    ...edge,
                    id: `assist-edge-${index}-${Date.now()}`
                }));
                setNodes(nodesWithPositions);
                setEdges(edgesWithIds);
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'عذراً، حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([]);
        setCurrentWorkflow(null);
        setCurrentForm(null);
        setServiceName('');
        setServiceKey('');
        setNodes([]);
        setEdges([]);
        setIsManualEdit(false);
    };

    const router = useRouter();

    const handleSave = async () => {
        // Use manually edited workflow if in edit mode
        const workflowToSave = isManualEdit
            ? { nodes, edges }
            : currentWorkflow;

        if (!workflowToSave || !currentForm) {
            alert('لا يوجد مخطط للحفظ');
            return;
        }

        if (!serviceName || !serviceKey) {
            alert('معلومات الخدمة غير كاملة');
            return;
        }

        try {
            const { saveGeneratedService } = await import('@/app/actions');
            const result = await saveGeneratedService(
                serviceName,
                serviceKey,
                workflowToSave as WorkflowDefinition,
                currentForm
            );

            // Redirect to services page instead of reset
            router.push('/dashboard/admin/services');
            router.refresh();

        } catch (error) {
            console.error('Save error:', error);
            alert(`❌ فشل الحفظ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
    };

    const toggleManualEdit = () => {
        setIsManualEdit(!isManualEdit);
        if (!isManualEdit && currentWorkflow) {
            // Sync current workflow to ReactFlow
            const nodesWithPositions = currentWorkflow.nodes.map((node, index) => ({
                ...node,
                id: node.id || `node-${index}-${Date.now()}`,
                position: node.position || { x: 250, y: 50 + (index * 150) }
            }));
            const edgesWithIds = currentWorkflow.edges.map((edge, index) => ({
                ...edge,
                id: `assist-edge-${index}-${Date.now()}`
            }));
            setNodes(nodesWithPositions);
            setEdges(edgesWithIds);
        }
    };

    const onConnect = (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds));

    return (
        <div className="flex flex-col h-[calc(100vh-280px)]">
            {/* Action Bar */}
            {currentWorkflow && (
                <div className="bg-white border-b shadow-sm">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span>المخطط جاهز</span>
                                </div>
                                {serviceName && (
                                    <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                        {serviceName}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={toggleManualEdit} variant="outline" size="sm">
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    {isManualEdit ? 'عرض فقط' : 'تعديل يدوي'}
                                </Button>
                                <Button onClick={() => setIsFullscreen(!isFullscreen)} variant="outline" size="sm">
                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </Button>
                                <Button onClick={handleSave} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                                    <Save className="w-4 h-4 mr-2" /> حفظ الخدمة
                                </Button>
                                <Button onClick={handleReset} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                                    <RotateCcw className="w-4 h-4 mr-2" /> إعادة تعيين
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className={`flex-1 ${isFullscreen ? 'fixed inset-0 z-50 bg-white pt-20' : 'container mx-auto'} flex gap-6 p-6`}>
                {/* Chat Panel */}
                {!isFullscreen && (
                    <div className="w-1/3 flex flex-col bg-white rounded-2xl shadow-xl border-2 border-gray-200">
                        {/* Chat Header */}
                        <div className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">محادثة المساعد</h3>
                                    <p className="text-xs text-purple-100">اطلب ما تريد وسأساعدك</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                            {messages.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-10 h-10 text-purple-600" />
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900 mb-2">ابدأ المحادثة</p>
                                    <p className="text-sm text-gray-500 mb-4">صف الخدمة التي تريد إنشاءها</p>
                                    <div className="max-w-md mx-auto space-y-2">
                                        <div className="text-xs text-right bg-purple-50 p-3 rounded-lg border border-purple-200">
                                            <span className="font-semibold text-purple-700">مثال:</span>
                                            <p className="text-gray-700 mt-1">"أريد خدمة طلب إجازة تحتاج موافقة المدير ثم HR"</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <ChatMessageComponent key={idx} message={msg} />
                            ))}

                            {isLoading && (
                                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                                    <div>
                                        <p className="text-sm font-medium text-purple-900">المساعد يعمل...</p>
                                        <p className="text-xs text-purple-600">جاري تحليل طلبك وإنشاء المخطط</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Form */}
                        <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50 rounded-b-2xl">
                            <div className="flex gap-3">
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="اكتب طلبك هنا..."
                                    className="flex-1 min-h-[80px] resize-none border-2 focus:border-purple-400 rounded-xl"
                                    disabled={isLoading}
                                />
                                <div className="flex flex-col gap-2">
                                    <ImageUploadButton
                                        onImageSelected={setSelectedImage}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isLoading || (!input.trim() && !selectedImage)}
                                        className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:from-[#2563EB] hover:to-[#3B82F6] h-auto px-6 flex-1"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                <span className="sr-only">إرسال</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Workflow Preview/Editor Panel */}
                <div className={`${isFullscreen ? 'w-full h-full' : 'w-2/3'} flex flex-col bg-white rounded-xl shadow-lg border overflow-hidden`}>

                    {/* Header & Tabs */}
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h2 className="font-bold text-gray-900">
                                {isManualEdit ? '🖊️ تعديل الخدمة' : '👁️ معاينة الخدمة'}
                            </h2>

                            {/* View Switcher Tabs */}
                            <div className="flex bg-gray-200 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveView('workflow')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeView === 'workflow'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    مخطط السير
                                </button>
                                <button
                                    onClick={() => setActiveView('form')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeView === 'form'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    نموذج البيانات
                                </button>
                                <button
                                    onClick={() => setActiveView('schema')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeView === 'schema'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    JSON البيانات
                                </button>
                            </div>
                        </div>

                        {isFullscreen && (
                            <Button onClick={() => setIsFullscreen(false)} variant="outline" size="sm">
                                <Minimize2 className="w-4 h-4 mr-2" /> تصغير
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Toolbox - Only in Manual Edit Mode AND Workflow View */}
                        {isManualEdit && activeView === 'workflow' && (
                            <div className="w-56 border-l bg-gray-50 overflow-y-auto shrink-0">
                                <div className="p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">صندوق الأدوات</h3>
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 uppercase mb-2">أساسي</p>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => {
                                                    const id = `start-${nodes.length + 1}`;
                                                    const newNode: Node = {
                                                        id,
                                                        type: 'start',
                                                        position: { x: Math.random() * 300, y: Math.random() * 300 },
                                                        data: { label: 'بداية' },
                                                    };
                                                    setNodes((nds) => nds.concat(newNode));
                                                }}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm"
                                            >
                                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs">▶</div>
                                                <span>بداية</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const id = `end-${nodes.length + 1}`;
                                                    const newNode: Node = {
                                                        id,
                                                        type: 'end',
                                                        position: { x: Math.random() * 300, y: Math.random() * 300 },
                                                        data: { label: 'نهاية' },
                                                    };
                                                    setNodes((nds) => nds.concat(newNode));
                                                }}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all text-sm"
                                            >
                                                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white text-xs">■</div>
                                                <span>نهاية</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 uppercase mb-2">إجراءات</p>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => {
                                                    const id = `approval-${nodes.length + 1}`;
                                                    const newNode: Node = {
                                                        id,
                                                        type: 'approval',
                                                        position: { x: Math.random() * 300, y: Math.random() * 300 },
                                                        data: { label: 'موافقة', role: 'موظف', sla_hours: 24 },
                                                    };
                                                    setNodes((nds) => nds.concat(newNode));
                                                }}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm"
                                            >
                                                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xs">✓</div>
                                                <span>موافقة</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const id = `action-${nodes.length + 1}`;
                                                    const newNode: Node = {
                                                        id,
                                                        type: 'action',
                                                        position: { x: Math.random() * 300, y: Math.random() * 300 },
                                                        data: { label: 'إجراء', role: 'موظف', sla_hours: 24 },
                                                    };
                                                    setNodes((nds) => nds.concat(newNode));
                                                }}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-sm"
                                            >
                                                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs">⚡</div>
                                                <span>إجراء</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 uppercase mb-2">منطق</p>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => {
                                                    const id = `gateway-${nodes.length + 1}`;
                                                    const newNode: Node = {
                                                        id,
                                                        type: 'gateway',
                                                        position: { x: Math.random() * 300, y: Math.random() * 300 },
                                                        data: { label: 'AND' },
                                                    };
                                                    setNodes((nds) => nds.concat(newNode));
                                                }}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-all text-sm"
                                            >
                                                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-xs">◆</div>
                                                <span>بوابة</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const id = `join-${nodes.length + 1}`;
                                                    const newNode: Node = {
                                                        id,
                                                        type: 'join',
                                                        position: { x: Math.random() * 300, y: Math.random() * 300 },
                                                        data: { label: 'JOIN' },
                                                    };
                                                    setNodes((nds) => nds.concat(newNode));
                                                }}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm"
                                            >
                                                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-xs">⊕</div>
                                                <span>دمج</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 relative bg-gray-50/50">
                            {currentWorkflow ? (
                                activeView === 'workflow' ? (
                                    /* Workflow View */
                                    isManualEdit ? (
                                        <ReactFlow
                                            nodes={nodes}
                                            edges={edges}
                                            onNodesChange={onNodesChange}
                                            onEdgesChange={onEdgesChange}
                                            onConnect={onConnect}
                                            nodeTypes={nodeTypes}
                                            fitView
                                        >
                                            <Controls />
                                            <MiniMap />
                                            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                                        </ReactFlow>
                                    ) : (
                                        <WorkflowPreview workflow={currentWorkflow} />
                                    )
                                ) : activeView === 'form' ? (
                                    /* Form View */
                                    <div className="p-8 max-w-2xl mx-auto overflow-y-auto h-full text-right" dir="rtl">
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                            <div className="mb-6 border-b pb-4">
                                                <h3 className="text-lg font-bold text-gray-900">{serviceName || 'نموذج الخدمة'}</h3>
                                                <p className="text-sm text-gray-500 mt-1">هذه هي الحقول التي سيقوم مقدم الطلب بتعبئتها</p>
                                            </div>

                                            <div className="flex flex-wrap gap-4">
                                                {currentForm?.pages?.flatMap(page =>
                                                    page.sections.flatMap(section =>
                                                        section.fields.map((field, idx) => {
                                                            if (!evalVis(field as FieldDefinition)) return null;

                                                            const widthClass = field.width === '1/3' ? 'w-[calc(33.33%-11px)]'
                                                                : field.width === '1/2' ? 'w-[calc(50%-8px)]'
                                                                    : 'w-full';

                                                            return (
                                                                <div key={`${page.id}-${section.id}-${idx}`} className={`${widthClass} space-y-1.5`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1">
                                                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                                                            {field.rules && field.rules.length > 0 && (
                                                                                <span title="Conditional Logic Applied" className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                                            )}
                                                                        </label>
                                                                        {field.type !== 'section' && (
                                                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1 rounded">{field.key}</span>
                                                                        )}
                                                                    </div>

                                                                    {field.type === 'section' ? (
                                                                        <div className="mt-4 mb-2 pb-1 border-b border-gray-200">
                                                                            <h4 className="font-bold text-gray-900">{field.label}</h4>
                                                                            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
                                                                        </div>
                                                                    ) : (field.type === 'choice_single' || field.type === 'select') ? (
                                                                        <div className="relative">
                                                                            <select
                                                                                onChange={(e) => setPreviewValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                                                className="w-full appearance-none px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                                value={previewValues[field.key] || ""}
                                                                            >
                                                                                <option value="">{field.placeholder || "اختر من القائمة..."}</option>
                                                                                {(field.config?.options || (field as any).options)?.map((opt: any, i: number) => (
                                                                                    <option key={i} value={opt.value}>{opt.label}</option>
                                                                                ))}
                                                                            </select>
                                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                                </svg>
                                                                            </div>
                                                                        </div>
                                                                    ) : field.type === 'attachment' ? (
                                                                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                                                                            <span className="text-xs text-gray-500">حقل مرفقات (Upload Placeholder)</span>
                                                                        </div>
                                                                    ) : (
                                                                        <input
                                                                            type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                                                                            placeholder={field.placeholder || "أدخل القيمة..."}
                                                                            value={previewValues[field.key] || ""}
                                                                            onChange={(e) => setPreviewValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                    )}

                                                                    {field.description && (
                                                                        <p className="text-[11px] text-gray-500">{field.description}</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )
                                                )}

                                                {(!currentForm?.pages || currentForm.pages.length === 0) && (
                                                    <div className="w-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <h3 className="text-sm font-medium text-gray-900">لا توجد حقول</h3>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            اطلب من المساعد إضافة حقول لنموذج الخدمة
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Schema JSON View */
                                    <div className="p-8 h-full overflow-y-auto">
                                        <div className="bg-gray-900 rounded-xl p-6 shadow-inner font-mono text-sm text-blue-300 text-left" dir="ltr">
                                            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2 text-gray-400">
                                                <span>Form Schema Snapshot</span>
                                                <button
                                                    onClick={() => {
                                                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                                            navigator.clipboard.writeText(JSON.stringify(currentForm, null, 2));
                                                        } else {
                                                            alert('Clipboard API is not available in this browser context.');
                                                        }
                                                    }}
                                                    className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                                >
                                                    Copy JSON
                                                </button>
                                            </div>
                                            <pre className="whitespace-pre-wrap">
                                                {JSON.stringify(currentForm, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <div className="text-center">
                                        <Sparkles className="w-24 h-24 mx-auto mb-4 opacity-20" />
                                        <p>سيظهر المخطط والنموذج هنا بعد الإنشاء</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChatMessageComponent({ message }: { message: Message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 space-y-3 ${isUser
                ? 'bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white'
                : 'bg-gray-100 text-gray-900 border'
                }`}>

                {message.image && (
                    <div className="mb-2">
                        <img
                            src={message.image}
                            alt="Uploaded content"
                            className="max-w-full rounded-lg border border-white/20 shadow-sm max-h-60 object-contain bg-black/10"
                        />
                    </div>
                )}

                {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
            </div>
        </div>
    );
}
