// Check authentication
const token = checkAuth();
const user = getCurrentUser();

let currentWorkflowId = null;
let services = [];

// Display user name
if (user) {
    document.getElementById('userName').textContent = user.full_name || user.email;
}

// Load workflows
async function loadWorkflows() {
    try {
        const response = await apiCall('/api/workflows');
        if (response.ok) {
            const workflows = await response.json();
            displayWorkflows(workflows);
        }
    } catch (error) {
        console.error('Error loading workflows:', error);
        document.getElementById('workflowsList').innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-light);">
                Error loading workflows. Please try again.
            </div>
        `;
    }
}

// Display workflows
function displayWorkflows(workflows) {
    const container = document.getElementById('workflowsList');

    if (workflows.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; background: var(--card-bg); border-radius: 16px;">
                <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                <h3>No Workflows Yet</h3>
                <p style="color: var(--text-light);">Create your first workflow to automate request approval</p>
            </div>
        `;
        return;
    }

    container.innerHTML = workflows.map(workflow => `
        <div style="background: var(--card-bg); padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="margin-bottom: 8px;">${workflow.name}</h3>
                    <p style="color: var(--text-light); margin-bottom: 12px;">${workflow.description || 'No description'}</p>
                    <div style="display: flex; gap: 16px; font-size: 14px; color: var(--text-light);">
                        <span>🔑 ${workflow.workflow_key}</span>
                        <span>📋 ${workflow.step_count || 0} steps</span>
                        ${workflow.is_active ? '<span style="color: var(--success);">✓ Active</span>' : '<span style="color: var(--text-light);">○ Inactive</span>'}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="viewWorkflowSteps(${workflow.id})" style="padding: 8px 16px; border: 1px solid var(--border); background: white; border-radius: 8px; cursor: pointer;">
                        View Steps
                    </button>
                    <button onclick="editWorkflow(${workflow.id})" style="padding: 8px 16px; border: 1px solid var(--border); background: white; border-radius: 8px; cursor: pointer;">
                        Edit
                    </button>
                    <button onclick="deleteWorkflow(${workflow.id})" style="padding: 8px 16px; border: 1px solid var(--danger); background: white; color: var(--danger); border-radius: 8px; cursor: pointer;">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Load services
async function loadServices() {
    try {
        const response = await apiCall('/api/services');
        if (response.ok) {
            services = await response.json();
            const select = document.getElementById('serviceId');
            select.innerHTML = '<option value="">-- Select Service (Optional) --</option>' +
                services.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Show create modal
function showCreateModal() {
    currentWorkflowId = null;
    document.getElementById('modalTitle').textContent = 'Create Workflow';
    document.getElementById('saveBtn').textContent = 'Create Workflow';
    document.getElementById('workflowName').value = '';
    document.getElementById('workflowKey').value = '';
    document.getElementById('workflowDescription').value = '';
    document.getElementById('serviceId').value = '';
    document.getElementById('modalError').style.display = 'none';
    document.getElementById('workflowModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('workflowModal').style.display = 'none';
}

// Save workflow
async function saveWorkflow() {
    const name = document.getElementById('workflowName').value.trim();
    const key = document.getElementById('workflowKey').value.trim();
    const description = document.getElementById('workflowDescription').value.trim();
    const serviceId = document.getElementById('serviceId').value;

    const errorDiv = document.getElementById('modalError');
    errorDiv.style.display = 'none';

    if (!name || !key) {
        errorDiv.textContent = 'Name and Key are required';
        errorDiv.style.display = 'block';
        return;
    }

    const data = {
        name,
        workflow_key: key,
        description,
        service_id: serviceId ? parseInt(serviceId) : null,
        is_active: true
    };

    try {
        const url = currentWorkflowId ? `/api/workflows/${currentWorkflowId}` : '/api/workflows';
        const method = currentWorkflowId ? 'PUT' : 'POST';

        const response = await apiCall(url, {
            method,
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            loadWorkflows();
        } else {
            const error = await response.json();
            errorDiv.textContent = error.message || 'Failed to save workflow';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to save workflow';
        errorDiv.style.display = 'block';
    }
}

// Edit workflow
async function editWorkflow(id) {
    try {
        const response = await apiCall(`/api/workflows/${id}`);
        if (response.ok) {
            const workflow = await response.json();
            currentWorkflowId = id;
            document.getElementById('modalTitle').textContent = 'Edit Workflow';
            document.getElementById('saveBtn').textContent = 'Save Changes';
            document.getElementById('workflowName').value = workflow.name;
            document.getElementById('workflowKey').value = workflow.workflow_key;
            document.getElementById('workflowDescription').value = workflow.description || '';
            document.getElementById('serviceId').value = workflow.service_id || '';
            document.getElementById('modalError').style.display = 'none';
            document.getElementById('workflowModal').style.display = 'flex';
        }
    } catch (error) {
        alert('Failed to load workflow');
    }
}

// Delete workflow
async function deleteWorkflow(id) {
    if (!confirm('Are you sure you want to delete this workflow?')) {
        return;
    }

    try {
        const response = await apiCall(`/api/workflows/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadWorkflows();
        } else {
            alert('Failed to delete workflow');
        }
    } catch (error) {
        alert('Failed to delete workflow');
    }
}

// View workflow steps
function viewWorkflowSteps(id) {
    window.location.href = `/workflow-steps.html?id=${id}`;
}

// Close modal on outside click
document.getElementById('workflowModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'workflowModal') {
        closeModal();
    }
});

// Load data on page load
loadWorkflows();
loadServices();
