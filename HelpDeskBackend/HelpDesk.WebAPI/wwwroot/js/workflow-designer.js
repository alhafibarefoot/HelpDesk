// Workflow Designer - Visual Canvas Implementation
// Global State
let nodes = [];
let edges = [];
let selectedNode = null;
let connecting = null;
let workflowId = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let panOffset = { x: 0, y: 0 };
let scale = 1;

// SVG Canvas
const svg = document.getElementById('workflowCanvas');
const propertiesPanel = document.getElementById('propertiesPanel');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    loadWorkflowFromURL();
    setupDragAndDrop();
    setupCanvasEvents();
});

function initializeCanvas() {
    // Create groups for organization
    const connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    connectionsGroup.id = 'connections';
    svg.appendChild(connectionsGroup);

    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.id = 'nodes';
    svg.appendChild(nodesGroup);
}

function loadWorkflowFromURL() {
    const params = new URLSearchParams(window.location.search);
    workflowId = params.get('id');

    if (workflowId) {
        loadWorkflow(workflowId);
    } else {
        // Create default start and end nodes
        addNode({ type: 'start', x: 250, y: 100 });
        addNode({ type: 'end', x: 250, y: 500 });
    }
}

async function loadWorkflow(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/workflows/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const workflow = await response.json();

            if (workflow.definition) {
                const def = typeof workflow.definition === 'string'
                    ? JSON.parse(workflow.definition)
                    : workflow.definition;

                // Load nodes
                if (def.nodes) {
                    def.nodes.forEach(n => {
                        addNode({
                            id: n.id,
                            type: n.type,
                            x: n.position.x,
                            y: n.position.y,
                            data: n.data
                        });
                    });
                }

                // Load edges
                if (def.edges) {
                    def.edges.forEach(e => {
                        addEdge(e.source, e.target, e.data);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Failed to load workflow:', error);
    }
}

// Drag and Drop from Palette
function setupDragAndDrop() {
    const paletteItems = document.querySelectorAll('.node-item');

    paletteItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('nodeType', item.dataset.type);
        });
    });

    svg.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    svg.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('nodeType');

        if (type) {
            const rect = svg.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            addNode({ type, x, y });
        }
    });
}

// Add Node to Canvas
function addNode(config) {
    const node = {
        id: config.id || `node-${Date.now()}`,
        type: config.type,
        x: config.x || 250,
        y: config.y || 150,
        data: config.data || {
            label: config.type.charAt(0).toUpperCase() + config.type.slice(1),
            step_order: nodes.length + 1
        }
    };

    nodes.push(node);
    renderNode(node);
}

function renderNode(node) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', node.id);
    group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    group.classList.add('node');
    group.style.cursor = 'move';

    // Node styling based on type
    const styles = getNodeStyle(node.type);

    // Node body
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '140');
    rect.setAttribute('height', '60');
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', styles.fill);
    rect.setAttribute('stroke', styles.stroke);
    rect.setAttribute('stroke-width', '2');
    group.appendChild(rect);

    // Node label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '70');
    text.setAttribute('y', '35');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', styles.textColor);
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', '600');
    text.textContent = node.data.label || node.type;
    group.appendChild(text);

    // Connection handles
    if (node.type !== 'start') {
        createConnectionHandle(group, 'input', 0, 30);
    }
    if (node.type !== 'end') {
        createConnectionHandle(group, 'output', 140, 30);
    }

    // Event listeners
    setupNodeEvents(group, node);

    document.getElementById('nodes').appendChild(group);
}

function getNodeStyle(type) {
    const styles = {
        start: { fill: '#28a745', stroke: '#1e7e34', textColor: 'white' },
        end: { fill: '#dc3545', stroke: '#c82333', textColor: 'white' },
        Approval: { fill: '#007bff', stroke: '#0056b3', textColor: 'white' },
        Execution: { fill: '#fd7e14', stroke: '#dc6502', textColor: 'white' },
        ParallelFork: { fill: '#6f42c1', stroke: '#5a32a3', textColor: 'white' },
        ParallelJoin: { fill: '#6f42c1', stroke: '#5a32a3', textColor: 'white' },
        Gateway: { fill: '#ffc107', stroke: '#d39e00', textColor: '#212529' },
        SubWorkflow: { fill: '#17a2b8', stroke: '#117a8b', textColor: 'white' },
        Notification: { fill: '#20c997', stroke: '#199d76', textColor: 'white' },
    };
    return styles[type] || { fill: '#6c757d', stroke: '#495057', textColor: 'white' };
}

function createConnectionHandle(group, type, x, y) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', 'white');
    circle.setAttribute('stroke', '#495057');
    circle.setAttribute('stroke-width', '2');
    circle.classList.add(`handle-${type}`);
    circle.style.cursor = 'crosshair';

    circle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startConnection(group.id, type);
    });

    group.appendChild(circle);
}

function setupNodeEvents(group, node) {
    let dragStart = null;

    group.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('handle-input') || e.target.classList.contains('handle-output')) {
            return;
        }

        e.stopPropagation();
        isDragging = true;
        selectedNode = node;
        showProperties(node);

        const transform = group.getAttribute('transform');
        const match = transform.match(/translate\(([\d.]+),\s*([\d.]+)\)/);
        if (match) {
            dragStart = {
                x: parseFloat(match[1]),
                y: parseFloat(match[2]),
                mouseX: e.clientX,
                mouseY: e.clientY
            };
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging && dragStart) {
            const dx = e.clientX - dragStart.mouseX;
            const dy = e.clientY - dragStart.mouseY;

            node.x = dragStart.x + dx;
            node.y = dragStart.y + dy;

            group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            updateConnections(node.id);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragStart = null;
    });

    // Double-click to edit
    group.addEventListener('dblclick', () => {
        showProperties(node);
    });
}

// Connections
function startConnection(nodeId, handleType) {
    if (handleType === 'output') {
        connecting = { source: nodeId };
    }
}

function addEdge(sourceId, targetId, data = null) {
    const edge = {
        id: `edge-${Date.now()}`,
        source: sourceId,
        target: targetId,
        data: data
    };

    edges.push(edge);
    renderEdge(edge);
}

function renderEdge(edge) {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);

    if (!source || !target) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', edge.id);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#495057');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('marker-end', 'url(#arrowhead)');

    const d = calculateEdgePath(source, target);
    path.setAttribute('d', d);

    document.getElementById('connections').appendChild(path);

    // Add arrowhead marker if not exists
    if (!document.getElementById('arrowhead')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', '#495057');

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.insertBefore(defs, svg.firstChild);
    }
}

function calculateEdgePath(source, target) {
    const x1 = source.x + 140;
    const y1 = source.y + 30;
    const x2 = target.x;
    const y2 = target.y + 30;

    const midX = (x1 + x2) / 2;

    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

function updateConnections(nodeId) {
    edges.forEach(edge => {
        if (edge.source === nodeId || edge.target === nodeId) {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);

            if (source && target) {
                const path = document.getElementById(edge.id);
                if (path) {
                    const d = calculateEdgePath(source, target);
                    path.setAttribute('d', d);
                }
            }
        }
    });
}

function setupCanvasEvents() {
    svg.addEventListener('mouseup', (e) => {
        if (connecting && connecting.source) {
            const target = e.target.closest('.node');
            if (target && target.id !== connecting.source) {
                addEdge(connecting.source, target.id);
            }
        }
        connecting = null;
    });
}

// Properties Panel
function showProperties(node) {
    propertiesPanel.classList.add('show');
    const content = document.getElementById('propertiesContent');

    content.innerHTML = `
        <div class="form-group">
            <label>Node Type</label>
            <input type="text" value="${node.type}" disabled>
        </div>
        <div class="form-group">
            <label>Label</label>
            <input type="text" id="nodeLabel" value="${node.data.label || ''}" onchange="updateNodeProperty('label', this.value)">
        </div>
        <div class="form-group">
            <label>Step Order</label>
            <input type="number" id="nodeOrder" value="${node.data.step_order || 1}" onchange="updateNodeProperty('step_order', parseInt(this.value))">
        </div>
        ${node.type !== 'start' && node.type !== 'end' ? `
        <div class="form-group">
            <label>Assigned Role</label>
            <select id="nodeRole" onchange="updateNodeProperty('role', this.value)">
                <option value="">None</option>
                <option value="Admin" ${node.data.role === 'Admin' ? 'selected' : ''}>Admin</option>
                <option value="Approver" ${node.data.role === 'Approver' ? 'selected' : ''}>Approver</option>
                <option value="ServiceOwner" ${node.data.role === 'ServiceOwner' ? 'selected' : ''}>Service Owner</option>
            </select>
        </div>
        <div class="form-group">
            <label>Department</label>
            <input type="text" id="nodeDept" value="${node.data.department || ''}" onchange="updateNodeProperty('department', this.value)">
        </div>
        <div class="form-group">
            <label>SLA Hours</label>
            <input type="number" id="nodeSla" value="${node.data.sla_hours || 24}" onchange="updateNodeProperty('sla_hours', parseInt(this.value))">
        </div>
        ` : ''}
        <div class="form-group">
            <button class="btn btn-secondary" style="width: 100%; margin-top: 10px;" onclick="deleteNode()">🗑️ Delete Node</button>
        </div>
    `;
}

function updateNodeProperty(key, value) {
    if (selectedNode) {
        selectedNode.data[key] = value;

        // Update label visually
        if (key === 'label') {
            const nodeGroup = document.getElementById(selectedNode.id);
            const text = nodeGroup.querySelector('text');
            if (text) text.textContent = value;
        }
    }
}

function deleteNode() {
    if (!selectedNode) return;

    if (selectedNode.type === 'start' || selectedNode.type === 'end') {
        alert('Cannot delete start or end nodes!');
        return;
    }

    // Remove from DOM
    const nodeElement = document.getElementById(selectedNode.id);
    if (nodeElement) nodeElement.remove();

    // Remove connected edges
    edges = edges.filter(e => {
        if (e.source === selectedNode.id || e.target === selectedNode.id) {
            const edgeElement = document.getElementById(e.id);
            if (edgeElement) edgeElement.remove();
            return false;
        }
        return true;
    });

    // Remove from array
    nodes = nodes.filter(n => n.id !== selectedNode.id);

    selectedNode = null;
    propertiesPanel.classList.remove('show');
}

// Workflow Actions
function clearCanvas() {
    if (!confirm('Clear all nodes and start over?')) return;

    nodes = [];
    edges = [];
    document.getElementById('nodes').innerHTML = '';
    document.getElementById('connections').innerHTML = '';
    propertiesPanel.classList.remove('show');

    // Add default nodes
    addNode({ type: 'start', x: 250, y: 100 });
    addNode({ type: 'end', x: 250, y: 500 });
}

function validateWorkflow() {
    const errors = [];

    const startNodes = nodes.filter(n => n.type === 'start');
    const endNodes = nodes.filter(n => n.type === 'end');

    if (startNodes.length === 0) errors.push('❌ Workflow must have a start node');
    if (startNodes.length > 1) errors.push('❌ Workflow can only have one start node');
    if (endNodes.length === 0) errors.push('❌ Workflow must have at least one end node');

    // Check for disconnected nodes
    nodes.forEach(node => {
        if (node.type === 'start') return;
        const hasIncoming = edges.some(e => e.target === node.id);
        if (!hasIncoming) errors.push(`❌ Node "${node.data.label}" has no incoming connections`);
    });

    if (errors.length > 0) {
        alert('Validation Errors:\n\n' + errors.join('\n'));
    } else {
        alert('✅ Workflow is valid!');
    }
}

async function saveWorkflow() {
    const definition = {
        version: "1.0",
        nodes: nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: { x: n.x, y: n.y },
            data: n.data
        })),
        edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            data: e.data
        }))
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/workflows/${workflowId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                definition: definition
            })
        });

        if (response.ok) {
            alert('✅ Workflow saved successfully!');
        } else {
            alert('❌ Failed to save workflow');
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('❌ Error saving workflow');
    }
}
