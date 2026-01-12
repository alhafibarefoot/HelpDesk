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
import { Save, Plus, LayoutTemplate, MousePointerClick, Wand2, Copy } from "lucide-react";
import { saveWorkflow } from "@/app/actions";
import { StartNode, EndNode, FormNode, ApprovalNode, ActionNode, GatewayNode, JoinNode, SubWorkflowNode } from './flow/custom-nodes';
import { SaveTemplateDialog } from './save-template-dialog';
import { PropertiesPanel } from './flow/properties-panel';
import { WorkflowSummary } from '@/components/ui/workflow-summary';
import { TemplateLibrary } from './template-library';
import dagre from 'dagre';




interface VisualWorkflowEditorProps {
  serviceKey: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
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

export function VisualWorkflowEditor({ serviceKey, initialNodes = initialNodesMock, initialEdges = initialEdgesMock }: VisualWorkflowEditorProps) {
  // Ensure all nodes have valid positions
  const nodesWithPositions = initialNodes.map((node, index) => ({
    ...node,
    position: node.position?.x !== undefined && node.position?.y !== undefined
      ? node.position
      : { x: 250, y: 50 + (index * 150) }
  }));

  // Ensure all edges have unique IDs
  const edgesWithIds = initialEdges.map((edge, index) => ({
    ...edge,
    id: edge.id || `edge-${edge.source}-${edge.target}-${index}`
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithPositions);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesWithIds);
  const [selectedElement, setSelectedElement] = useState<Node | Edge | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

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
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  const addNode = (type: string, label: string) => {
    const id = `${type}-${nodes.length + 1}`;

    // Create type-specific data
    let nodeData: any = { label };

    switch (type) {
      case 'approval':
      case 'action':
        nodeData.role = 'موظف';
        nodeData.sla_hours = 24;
        break;
      case 'gateway':
        // AND or OR gateway
        nodeData.label = label; // 'AND' or 'OR'
        break;
      case 'join':
        nodeData.label = 'JOIN';
        break;
      case 'subworkflow':
        nodeData.service_key = ''; // User will set this
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
          return {
            ...edge,
            data: newData,
            label: newData.label
          };
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
    <div className="flex h-[700px] border rounded-lg bg-gray-50 overflow-hidden relative">
      {/* Sidebar / Toolbar */}
      <div className="w-16 bg-white border-l border-gray-200 flex flex-col items-center py-4 gap-3 z-10 shadow-sm overflow-y-auto">
        <div title="إدخال بيانات" onClick={() => addNode('form', 'نموذج')} className="p-2 bg-sky-50 text-sky-600 rounded-lg cursor-pointer hover:bg-sky-100 transition-colors">
          <span className="text-xl">📝</span>
        </div>
        <div title="موافقة" onClick={() => addNode('approval', 'موافقة')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors">
          <span className="text-xl">✓</span>
        </div>
        <div title="إجراء تنفيذي" onClick={() => addNode('action', 'إجراء')} className="p-2 bg-orange-50 text-orange-600 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors">
          <span className="text-xl">⚡</span>
        </div>
        <div className="h-px w-8 bg-gray-300 my-1"></div>
        <div title="بوابة توازي" onClick={() => addNode('gateway', 'AND')} className="p-2 bg-amber-50 text-amber-600 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
          <span className="font-bold text-xs">AND</span>
        </div>
        <div title="تجميع" onClick={() => addNode('join', 'JOIN')} className="p-2 bg-slate-100 text-slate-600 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
          <span className="font-bold text-xs">JOIN</span>
        </div>
        <div title="سير عمل فرعي" onClick={() => addNode('subworkflow', 'سير فرعي')} className="p-2 bg-purple-50 text-purple-600 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
          <span className="font-bold text-xs">SUB</span>
        </div>
        <div className="h-px w-8 bg-gray-300 my-1"></div>
        <div title="نهاية" onClick={() => addNode('end', 'مكتمل')} className="p-2 bg-gray-100 text-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
          <span className="text-xl">⏹️</span>
        </div>
        <div className="h-px w-8 bg-gray-300 my-1"></div>
        <div title="ترتيب تلقائي" onClick={onLayout} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
          <Wand2 size={18} />
        </div>
      </div>

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
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

          <Panel position="top-right" className="flex gap-2">
            <Button onClick={() => setShowTemplateLibrary(true)} variant="outline" size="sm" className="bg-white shadow-sm">
              <LayoutTemplate className="w-4 h-4 mr-2" /> استيراد قالب
            </Button>
            <Button onClick={() => setShowSaveTemplateDialog(true)} variant="outline" size="sm" className="bg-white shadow-sm">
              <Copy className="w-4 h-4 mr-2" /> حفظ كقالب
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isSaving} className="shadow-sm">
              <Save className="w-4 h-4 mr-2" /> حفظ المخطط
            </Button>
          </Panel>
        </ReactFlow>

        {selectedElement && (
          <PropertiesPanel
            element={selectedElement}
            onUpdate={updateElementData}
            onDelete={deleteElement}
            onClose={() => setSelectedElement(null)}
          />
        )}

        {/* Workflow Summary Panel */}
        {!selectedElement && (
          <div className="absolute top-4 left-4 w-80">
            <WorkflowSummary nodes={nodes} edges={edges} />
          </div>
        )}

        {/* Template Library Modal */}
        {showTemplateLibrary && (
          <TemplateLibrary
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplateLibrary(false)}
          />
        )}

        {/* Save Template Dialog */}
        {showSaveTemplateDialog && (
          <SaveTemplateDialog
            definition={{ nodes, edges }}
            onClose={() => setShowSaveTemplateDialog(false)}
            onSave={() => {
              alert('تم حفظ القالب بنجاح!');
              setShowSaveTemplateDialog(false);
            }}
          />
        )}
      </div>
    </div >
  );
}
