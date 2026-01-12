
'use client'

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    MarkerType,
    ReactFlowProvider,
    Node
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Save, AlertTriangle, RotateCcw, Play } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { saveServiceWorkflowAction } from '@/app/actions/workflow';
import { WorkflowDefinition } from '@/types';
import { Sidebar } from './sidebar';
import { NodePalette } from './node-palette';

// --- Types ---
interface WorkflowDesignerProps {
    serviceId: string;
    serviceKey: string;
    initialDefinition: WorkflowDefinition | null;
}

// --- Layout Helpers ---
// System Types: start, task, gateway, end
// RF Types: input, default, output (for v1 visualization)
const INITIAL_NODES = [
    { id: 'start', type: 'input', position: { x: 250, y: 50 }, data: { label: 'البداية', type: 'start' }, draggable: false, deletable: false },
    { id: 'end', type: 'output', position: { x: 250, y: 400 }, data: { label: 'النهاية', type: 'end' } }
];

export function WorkflowDesigner({ serviceId, serviceKey, initialDefinition }: WorkflowDesignerProps) {
    // State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Refs for Drag & Drop
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // --- Init Effect (Modified: Use useEffect instead of useState hack) ---
    useEffect(() => {
        if (initialDefinition) {
            // Transform JSON -> RF Nodes
            const rfNodes: Node[] = initialDefinition.nodes.map(n => {
                // Determine RF Type (visual) based on stored type or data.type
                const nativeType = (n as any).type || (n.data as any).type || 'task'; // fallback
                const visualType = mapNodeTypeToRF(nativeType);

                return {
                    id: n.id,
                    type: visualType,
                    position: n.position || { x: 250, y: 150 }, // Use root position
                    data: {
                        ...n.data,
                        type: nativeType // Guarantee 'type' exists in data for Logic
                    }
                };
            });

            const rfEdges: Edge[] = initialDefinition.edges.map(e => ({
                id: e.id || `${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                label: e.data?.condition ? 'Condition' : undefined,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                data: e.data
            }));

            setNodes(rfNodes);
            setEdges(rfEdges);
        } else {
            setNodes(INITIAL_NODES);
            setEdges([]);
        }
    }, [initialDefinition, setNodes, setEdges]);

    // --- Handlers ---
    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed }
    }, eds)), [setEdges]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow'); // e.g. 'task'
            if (typeof type === 'undefined' || !type) {
                return;
            }

            // Get Position
            const position = {
                x: event.clientX - 300,
                y: event.clientY - 100,
            };

            const visualType = mapNodeTypeToRF(type); // 'task' -> 'default'

            const newNode: Node = {
                id: `node-${Date.now()}`,
                type: visualType, // Visual type
                position,
                data: {
                    label: `New ${type}`,
                    type: type // Logical type (CRITICAL)
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [setNodes]
    );

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // --- Save Logic ---
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Transform RF -> JSON
            const definition: WorkflowDefinition = {
                version: "1.0",
                nodes: nodes.map(n => {
                    // Logic Type priority: data.type > default logic
                    const logicalType = (n.data as any).type || mapRFTypeToNode(n.type || 'default');

                    // Clean data: remove 'type' if you want, or keep it. Schema allows extra.
                    // Ideally, we keep it for UI State persistence if RF type is ambiguous.
                    const { ...nodeData } = n.data;

                    return {
                        id: n.id,
                        type: logicalType,
                        position: n.position, // Schema requires root position
                        data: nodeData
                    };
                }),
                edges: edges.map(e => ({
                    id: e.id, // Ensure ID exists
                    source: e.source,
                    target: e.target,
                    data: e.data
                }))
            };

            // 2. Client Side Validation Checks (UX)
            const startNodes = definition.nodes.filter(n => n.type === 'start');
            const endNodes = definition.nodes.filter(n => n.type === 'end');

            if (startNodes.length === 0) throw new Error("يجب أن يحتوي المخطط على نقطة بداية واحدة");
            if (startNodes.length > 1) throw new Error("لا يمكن وجود أكثر من نقطة بداية");
            if (endNodes.length === 0) throw new Error("يجب أن يحتوي المخطط على نقطة نهاية واحدة على الأقل");

            // 3. Server Action
            const result = await saveServiceWorkflowAction(serviceId, serviceKey, definition);

            if (result.success) {
                alert("تم الحفظ بنجاح!");
            } else {
                alert(`فشل الحفظ: ${result.message}`);
            }

        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-full w-full">
            <ReactFlowProvider>
                {/* Palette */}
                <NodePalette />

                {/* Canvas */}
                <div className="flex-1 h-full" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        fitView
                        attributionPosition="bottom-right"
                    >
                        <Background gap={12} size={1} />
                        <Controls />
                        <Panel position="top-right" className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
                            </Button>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Sidebar */}
                <Sidebar
                    selectedNodeId={selectedNodeId}
                    nodes={nodes}
                    setNodes={setNodes}
                />
            </ReactFlowProvider>
        </div>
    );
}

// --- Mappers ---
function mapNodeTypeToRF(type: string) {
    switch (type) {
        case 'start': return 'input';
        case 'end': return 'output';
        case 'task': return 'default';
        case 'gateway': return 'default';
        case 'parallel_fork': return 'default';
        case 'parallel_join': return 'default';
        default: return 'default';
    }
}

function mapRFTypeToNode(type: string): string {
    switch (type) {
        case 'input': return 'start';
        case 'output': return 'end';
        case 'default': return 'task'; // Fallback if data.type is missing
        default: return 'task';
    }
}
