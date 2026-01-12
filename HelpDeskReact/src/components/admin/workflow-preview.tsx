"use client"

import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StartNode, EndNode, ApprovalNode, ActionNode } from './flow/custom-nodes';
import { WorkflowDefinition } from '@/types';

interface WorkflowPreviewProps {
    workflow: WorkflowDefinition;
}

export default function WorkflowPreview({ workflow }: WorkflowPreviewProps) {
    const nodeTypes = {
        start: StartNode,
        end: EndNode,
        approval: ApprovalNode,
        action: ActionNode,
    };

    // Ensure all nodes have positions
    const nodesWithPositions = workflow.nodes.map((node, index) => ({
        ...node,
        position: node.position || { x: 250, y: 50 + (index * 150) }
    }));

    // Ensure all edges have unique IDs
    const edgesWithIds = (workflow.edges || []).map((edge, index) => ({
        ...edge,
        id: `preview-edge-${index}-${Date.now()}` // Force unique ID
    }));

    return (
        <div className="h-[400px] border rounded-lg bg-gray-50">
            <ReactFlow
                nodes={nodesWithPositions}
                edges={edgesWithIds}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
            >
                <Controls showInteractive={false} />
                <MiniMap />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}
