"use client"

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    Panel,
    NodeTypes,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import {
    Save,
    LayoutTemplate,
    Wand2,
    Copy,
    Play,
    Grid3x3,
    Maximize2,
    Download,
    Upload,
    Trash2,
    Settings,
    Plus
} from "lucide-react";
import { saveWorkflow } from "@/app/actions";
import { StartNode, EndNode, FormNode, ApprovalNode, ActionNode, GatewayNode, JoinNode, SubWorkflowNode } from './flow/custom-nodes';
import { SaveTemplateDialog } from './save-template-dialog';
import { PropertiesPanel } from './flow/properties-panel';
import { TemplateLibrary } from './template-library';
import dagre from 'dagre';

interface VisualWorkflowEditorProps {
    serviceKey: string;
    initialNodes?: Node[];
    initialEdges?: Edge[];
    formSchema?: any;
}

const initialNodesMock: Node[] = [
    { id: '1', position: { x: 250, y: 50 }, data: { label: 'البداية' }, type: 'start' },
    { id: '2', position: { x: 250, y: 200 }, data: { label: 'موافقة المدير', role: 'مشرف', sla_hours: 24 }, type: 'approval' },
    { id: '3', position: { x: 250, y: 400 }, data: { label: 'مكتمل' }, type: 'end' },
];

const initialEdgesMock: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3' },
];

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 180;
    const nodeHeight = 80;

    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = (direction === 'LR' ? 'left' : 'top') as Position;
        node.sourcePosition = (direction === 'LR' ? 'right' : 'bottom') as Position;

        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes: layoutedNodes, edges };
};

const nodeCategories = [
    {
        title: 'أساسي',
        nodes: [
            { type: 'start', label: 'بداية', icon: Play, color: 'bg-green-500' },
            { type: 'end', label: 'نهاية', icon: Save, color: 'bg-red-500' },
        ]
    },
    {
        title: 'إجراءات',
        nodes: [
            { type: 'form', label: 'نموذج', icon: Grid3x3, color: 'bg-blue-500' },
            { type: 'approval', label: 'موافقة', icon: Settings, color: 'bg-purple-500' },
            { type: 'action', label: 'إجراء', icon: Wand2, color: 'bg-orange-500' },
        ]
    },
    {
        title: 'منطق',
        nodes: [
            { type: 'gateway', label: 'بوابة', icon: Copy, color: 'bg-yellow-500' },
            { type: 'join', label: 'دمج', icon: Copy, color: 'bg-indigo-500' },
            { type: 'subworkflow', label: 'سير فرعي', icon: LayoutTemplate, color: 'bg-pink-500' },
        ]
    }
];

export function EnhancedWorkflowEditor({ serviceKey, initialNodes = initialNodesMock, initialEdges = initialEdgesMock, formSchema }: VisualWorkflowEditorProps) {
    const nodesWithPositions = initialNodes.map((node, index) => ({
        ...node,
        position: node.position?.x !== undefined && node.position?.y !== undefined
            ? node.position
            : { x: 250, y: 50 + (index * 150) }
    }));

    const edgesWithIds = initialEdges.map((edge, index) => ({
        ...edge,
        id: edge.id || `edge-${edge.source}-${edge.target}-${index}`
    }));

    const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithPositions);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgesWithIds);
    const [selectedElement, setSelectedElement] = useState<Node | Edge | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
    const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
    const [showToolbox, setShowToolbox] = useState(true);

    const nodeTypes = useMemo<NodeTypes>(() => ({
        start: StartNode,
        end: EndNode,
        form: FormNode,
        approval: ApprovalNode,
        action: ActionNode,
        gateway: GatewayNode,
        join: JoinNode,
        subworkflow: SubWorkflowNode,
    }), []);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds)), [setEdges]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedElement(node);
    }, []);

    const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        setSelectedElement(edge);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedElement(null);
    }, []);

    const onLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [nodes, edges, setNodes, setEdges]);

    const addNode = (type: string, label: string) => {
        const id = `${type}-${nodes.length + 1}`;
        let nodeData: any = { label };

        switch (type) {
            case 'approval':
            case 'action':
                nodeData.role = 'موظف';
                nodeData.sla_hours = 24;
                break;
            case 'gateway':
                nodeData.label = label;
                break;
            case 'join':
                nodeData.label = 'JOIN';
                break;
            case 'subworkflow':
                nodeData.service_key = '';
                break;
            case 'start':
            case 'end':
                nodeData.label = label;
                break;
        }

        const newNode: Node = {
            id,
            type,
            position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
            data: nodeData,
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const updateElementData = (id: string, newData: any, type: 'node' | 'edge') => {
        if (type === 'node') {
            setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: newData } : node));
        } else {
            setEdges((eds) => eds.map((edge) => {
                if (edge.id === id) {
                    return { ...edge, data: newData, label: newData.label };
                }
                return edge;
            }));
        }
        setSelectedElement((prev) => prev ? { ...prev, data: newData } : null);
    };

    const deleteElement = (id: string, type: 'node' | 'edge') => {
        if (type === 'node') {
            setNodes((nds) => nds.filter((n) => n.id !== id));
            setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        } else {
            setEdges((eds) => eds.filter((e) => e.id !== id));
        }
        setSelectedElement(null);
    };

    const validateWorkflow = () => {
        const startNodes = nodes.filter(n => n.type === 'start');
        if (startNodes.length !== 1) return "يجب أن يكون هناك نقطة بداية واحدة فقط.";

        const endNodes = nodes.filter(n => n.type === 'end');
        if (endNodes.length === 0) return "يجب أن يكون هناك نقطة نهاية واحدة على الأقل.";

        return null;
    };

    const handleSave = async () => {
        const error = validateWorkflow();
        if (error) {
            alert(`خطأ في المخطط: ${error}`);
            return;
        }

        setIsSaving(true);
        try {
            const definition = { version: '1.0' as const, nodes: nodes as any[], edges: edges as any[] };
            await saveWorkflow(serviceKey, definition);
            alert("تم حفظ المخطط بنجاح!");
        } catch (error) {
            console.error(error);
            alert("فشل الحفظ");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectTemplate = (template: any) => {
        if (confirm('هل أنت متأكد؟ سيتم استبدال المخطط الحالي بمحتوى القالب.')) {
            if (template.definition) {
                setNodes(template.definition.nodes || []);
                setEdges(template.definition.edges || []);
                setShowTemplateLibrary(false);
            }
        }
    };

    return (
        <div className="flex flex-col bg-gradient-to-br from-gray-50 to-gray-100" style={{ height: 'calc(100vh - 3rem)' }}>
            {/* Top Toolbar */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-900">مصمم سير العمل</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>{nodes.length} عقدة</span>
                            <span className="text-gray-300">•</span>
                            <span>{edges.length} اتصال</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTemplateLibrary(true)}
                            className="flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            استيراد قالب
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSaveTemplateDialog(true)}
                            className="flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            حفظ كقالب
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onLayout}
                            className="flex items-center gap-2"
                        >
                            <Maximize2 className="w-4 h-4" />
                            ترتيب تلقائي
                        </Button>

                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'جاري الحفظ...' : 'حفظ المخطط'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Toolbox Sidebar */}
                {showToolbox && (
                    <div className="w-72 bg-white border-l border-gray-200 shadow-lg overflow-y-auto pb-16">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">صندوق الأدوات</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowToolbox(false)}
                                >
                                    ×
                                </Button>
                            </div>

                            {nodeCategories.map((category, idx) => (
                                <div key={idx} className="mb-6">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                                        {category.title}
                                    </h4>
                                    <div className="space-y-2">
                                        {category.nodes.map((node) => {
                                            const Icon = node.icon;
                                            return (
                                                <button
                                                    key={node.type}
                                                    onClick={() => addNode(node.type, node.label)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                                >
                                                    <div className={`${node.color} p-2 rounded-lg text-white`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                                                        {node.label}
                                                    </span>
                                                    <Plus className="w-4 h-4 mr-auto text-gray-400 group-hover:text-blue-600" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onEdgeClick={onEdgeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-gray-50"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
                        <Controls className="bg-white border border-gray-200 rounded-lg shadow-lg" />
                        <MiniMap
                            className="bg-white border border-gray-200 rounded-lg shadow-lg"
                            nodeColor={(node) => {
                                switch (node.type) {
                                    case 'start': return '#10b981';
                                    case 'end': return '#ef4444';
                                    case 'approval': return '#8b5cf6';
                                    case 'action': return '#f59e0b';
                                    case 'form': return '#3b82f6';
                                    case 'gateway': return '#eab308';
                                    case 'join': return '#6366f1';
                                    default: return '#6b7280';
                                }
                            }}
                        />

                        {!showToolbox && (
                            <Panel position="top-left">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowToolbox(true)}
                                    className="bg-white shadow-lg"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    إظهار الأدوات
                                </Button>
                            </Panel>
                        )}
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                {selectedElement && (
                    <div className="w-80 bg-white border-r border-gray-200 shadow-lg overflow-y-auto pb-16">
                        <PropertiesPanel
                            element={selectedElement}
                            onUpdate={updateElementData}
                            onDelete={deleteElement}
                            onClose={() => setSelectedElement(null)}
                            formSchema={formSchema}
                        />
                    </div>
                )}
            </div>

            {/* Dialogs */}
            {showTemplateLibrary && (
                <TemplateLibrary
                    onClose={() => setShowTemplateLibrary(false)}
                    onSelectTemplate={handleSelectTemplate}
                />
            )}

            {showSaveTemplateDialog && (
                <SaveTemplateDialog
                    onClose={() => setShowSaveTemplateDialog(false)}
                    onSave={() => {
                        setShowSaveTemplateDialog(false);
                        alert("تم حفظ القالب بنجاح!");
                    }}
                    definition={{ nodes, edges }}
                />
            )}
        </div>
    );
}
