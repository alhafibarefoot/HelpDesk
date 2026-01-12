// Enhanced Workflow Designer with Zoom, Pan, Undo/Redo

// Additional toolbar functions for zoom controls
function addZoomControls() {
    const toolbar = document.querySelector('.toolbar-buttons');
    if (!toolbar) return;

    const zoomControls = `
        <button class="btn btn-secondary" onclick="zoomOut()">➖ Zoom Out</button>
        <button class="btn btn-secondary" onclick="resetZoom()">🔄 Reset</button>
        <button class="btn btn-secondary" onclick="zoomIn()">➕ Zoom In</button>
        <button class="btn btn-secondary" onclick="fitToView()">📐 Fit</button>
        <button class="btn btn-secondary" onclick="undo()">↶ Undo</button>
        <button class="btn btn-secondary" onclick="redo()">↷ Redo</button>
    `;

    toolbar.insertAdjacentHTML('afterbegin', zoomControls);
}

// Call after DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addZoomControls);
} else {
    addZoomControls();
}

// Zoom functions
let zoomScale = 1;
let panX = 0;
let panY = 0;

function zoomIn() {
    zoomScale = Math.min(3, zoomScale * 1.2);
    applyTransform();
}

function zoomOut() {
    zoomScale = Math.max(0.3, zoomScale / 1.2);
    applyTransform();
}

function resetZoom() {
    zoomScale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
}

function fitToView() {
    const svg = document.getElementById('workflowCanvas');
    const nodes = document.querySelectorAll('.node');
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
        const transform = node.getAttribute('transform');
        const match = transform.match(/translate\(([\d.]+),\s*([\d.]+)\)/);
        if (match) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + 140);
            maxY = Math.max(maxY, y + 60);
        }
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const svgRect = svg.getBoundingClientRect();

    const scaleX = (svgRect.width - 100) / width;
    const scaleY = (svgRect.height - 100) / height;
    zoomScale = Math.min(scaleX, scaleY, 1);

    panX = (svgRect.width - width * zoomScale) / 2 - minX * zoomScale;
    panY = (svgRect.height - height * zoomScale) / 2 - minY * zoomScale;

    applyTransform();
}

function applyTransform() {
    const nodesGroup = document.getElementById('nodes');
    const connectionsGroup = document.getElementById('connections');

    if (!nodesGroup || !connectionsGroup) return;

    const transform = `translate(${panX}, ${panY}) scale(${zoomScale})`;
    nodesGroup.setAttribute('transform', transform);
    connectionsGroup.setAttribute('transform', transform);
}

// Undo/Redo History
let workflowHistory = [];
let historyPosition = -1;

function captureState() {
    // Get current canvas state
    const state = {
        nodes: JSON.parse(JSON.stringify(nodes || [])),
        edges: JSON.parse(JSON.stringify(edges || []))
    };

    // Remove future history
    if (historyPosition < workflowHistory.length - 1) {
        workflowHistory = workflowHistory.slice(0, historyPosition + 1);
    }

    workflowHistory.push(state);
    if (workflowHistory.length > 50) {
        workflowHistory.shift();
    } else {
        historyPosition++;
    }
}

function undo() {
    if (historyPosition > 0) {
        historyPosition--;
        restoreState(workflowHistory[historyPosition]);
    }
}

function redo() {
    if (historyPosition < workflowHistory.length - 1) {
        historyPosition++;
        restoreState(workflowHistory[historyPosition]);
    }
}

function restoreState(state) {
    if (!state) return;

    // Update global state
    nodes = JSON.parse(JSON.stringify(state.nodes));
    edges = JSON.parse(JSON.stringify(state.edges));

    // Redraw canvas
    const nodesGroup = document.getElementById('nodes');
    const connectionsGroup = document.getElementById('connections');

    if (nodesGroup) nodesGroup.innerHTML = '';
    if (connectionsGroup) connectionsGroup.innerHTML = '';

    nodes.forEach(node => renderNode(node));
    edges.forEach(edge => renderEdge(edge));
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Z / Cmd+Z = Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }

    // Ctrl+Shift+Z / Ctrl+Y = Redo
    if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        redo();
    }

    // Ctrl+S = Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveWorkflow();
    }

    // Ctrl++ = Zoom In
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        zoomIn();
    }

    // Ctrl+- = Zoom Out
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
    }

    // Ctrl+0 = Reset Zoom
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
    }
});

// Mouse wheel zoom
document.getElementById('workflowCanvas')?.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomScale = Math.max(0.3, Math.min(3, zoomScale * delta));
        applyTransform();
    }
});

console.log('✅ Workflow Designer Enhanced: Zoom, Pan, Undo/Redo enabled!');
