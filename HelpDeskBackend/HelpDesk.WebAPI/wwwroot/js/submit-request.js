// Submit Request - JavaScript Logic
let selectedFiles = [];
let serviceFormDefinition = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    setupDragDrop();
    setupFormSubmission();
});

// Load available services
async function loadServices() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/services', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const services = await response.json();
            const select = document.getElementById('serviceId');

            select.innerHTML = '<option value="">Select a service...</option>';
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load services:', error);
    }
}

// Load service-specific form fields
async function loadServiceForm() {
    const serviceId = document.getElementById('serviceId').value;
    if (!serviceId) {
        document.getElementById('dynamicFields').classList.remove('show');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/services/${serviceId}/form`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            serviceFormDefinition = await response.json();
            renderDynamicFields(serviceFormDefinition);
        }
    } catch (error) {
        console.error('Failed to load service form:', error);
    }
}

// Render dynamic form fields
function renderDynamicFields(formDef) {
    const container = document.getElementById('customFieldsContainer');
    container.innerHTML = '';

    if (!formDef || !formDef.fields || formDef.fields.length === 0) {
        document.getElementById('dynamicFields').classList.remove('show');
        return;
    }

    document.getElementById('dynamicFields').classList.add('show');

    formDef.fields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'input-group';

        const label = document.createElement('label');
        label.textContent = field.label;
        if (field.required) label.classList.add('required');
        label.htmlFor = `field_${field.key}`;

        let input;
        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
                input = document.createElement('input');
                input.type = field.type;
                input.id = `field_${field.key}`;
                input.placeholder = field.placeholder || '';
                input.required = field.required || false;
                break;

            case 'textarea':
                input = document.createElement('textarea');
                input.id = `field_${field.key}`;
                input.placeholder = field.placeholder || '';
                input.required = field.required || false;
                break;

            case 'select':
                input = document.createElement('select');
                input.id = `field_${field.key}`;
                input.required = field.required || false;

                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = `Select ${field.label}...`;
                input.appendChild(defaultOption);

                (field.options || []).forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    input.appendChild(option);
                });
                break;

            case 'date':
                input = document.createElement('input');
                input.type = 'date';
                input.id = `field_${field.key}`;
                input.required = field.required || false;
                break;
        }

        div.appendChild(label);
        div.appendChild(input);
        container.appendChild(div);
    });
}

// Priority selection
function selectPriority(index) {
    const options = document.querySelectorAll('.priority-option');
    options.forEach((opt, i) => {
        if (i === index) {
            opt.classList.add('selected');
            opt.querySelector('input').checked = true;
        } else {
            opt.classList.remove('selected');
        }
    });
}

// File handling
function handleFiles(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`File "${file.name}" exceeds 10MB limit`);
            return;
        }
        selectedFiles.push(file);
    });
    renderFileList();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `
            <span>📄 ${file.name} (${formatFileSize(file.size)})</span>
            <button type="button" onclick="removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(div);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Drag and drop
function setupDragDrop() {
    const uploadArea = document.querySelector('.file-upload');

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.background = '#f8f9fa';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#dee2e6';
        uploadArea.style.background = 'white';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#dee2e6';
        uploadArea.style.background = 'white';

        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (file.size <= 10 * 1024 * 1024) {
                selectedFiles.push(file);
            }
        });
        renderFileList();
    });
}

// Form submission
function setupFormSubmission() {
    document.getElementById('requestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitRequest();
    });
}

async function submitRequest() {
    try {
        const token = localStorage.getItem('token');

        // Collect form data
        const formData = {
            service_id: parseInt(document.getElementById('serviceId').value),
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            priority: document.querySelector('input[name="priority"]:checked').value,
            department: 'General', // Could be dynamic
            custom_fields: {}
        };

        // Collect dynamic fields
        const dynamicFields = document.querySelectorAll('#customFieldsContainer input, #customFieldsContainer select, #customFieldsContainer textarea');
        dynamicFields.forEach(field => {
            const key = field.id.replace('field_', '');
            formData.custom_fields[key] = field.value;
        });

        // Create request
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to create request');
        }

        const result = await response.json();
        const requestId = result.id;

        // Upload attachments if any
        if (selectedFiles.length > 0) {
            await uploadAttachments(requestId);
        }

        // Success
        alert('✅ Request submitted successfully!\nRequest ID: ' + requestId);
        window.location.href = '/dashboard.html';

    } catch (error) {
        console.error('Submit error:', error);
        alert('❌ Failed to submit request: ' + error.message);
    }
}

async function uploadAttachments(requestId) {
    const token = localStorage.getItem('token');

    for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        await fetch(`/api/requests/${requestId}/attachments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
    }
}
