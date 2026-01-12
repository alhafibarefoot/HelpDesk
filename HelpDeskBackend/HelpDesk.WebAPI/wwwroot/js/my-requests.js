// My Requests - JavaScript Logic
let allRequests = [];
let filteredRequests = [];

document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
});

async function loadRequests() {
    try {
        const token = localStorage.getItem('token');
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;

        // Build query string
        let url = '/api/requests';
        const params = new URLSearchParams();

        if (statusFilter) params.append('status', statusFilter);
        if (priorityFilter) params.append('priority', priorityFilter);

        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            allRequests = await response.json();
            filteredRequests = allRequests;
            renderRequests();
        } else if (response.status === 401) {
            window.location.href = '/login.html';
        } else {
            showError();
        }
    } catch (error) {
        console.error('Failed to load requests:', error);
        showError();
    }
}

function renderRequests() {
    const tableBody = document.getElementById('requestsTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    const requestCount = document.getElementById('requestCount');

    loadingIndicator.style.display = 'none';

    if (filteredRequests.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        requestCount.textContent = '0 requests';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    requestCount.textContent = `${filteredRequests.length} request${filteredRequests.length !== 1 ? 's' : ''}`;

    tableBody.innerHTML = filteredRequests.map(request => `
        <tr onclick="viewRequest(${request.id})">
            <td><strong>#${request.id}</strong></td>
            <td>${request.service_name || 'N/A'}</td>
            <td>
                <div style="font-weight: 500;">${escapeHtml(request.title || 'Untitled')}</div>
                <div style="font-size: 12px; color: #6c757d;">${escapeHtml(truncate(request.description, 60))}</div>
            </td>
            <td>${getStatusBadge(request.status)}</td>
            <td>${getPriorityBadge(request.priority)}</td>
            <td>${formatDate(request.created_at)}</td>
            <td>${formatDate(request.updated_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="event.stopPropagation(); viewRequest(${request.id})">
                        👁️ View
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterRequests() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    if (!searchTerm) {
        filteredRequests = allRequests;
    } else {
        filteredRequests = allRequests.filter(request =>
            (request.title && request.title.toLowerCase().includes(searchTerm)) ||
            (request.description && request.description.toLowerCase().includes(searchTerm)) ||
            (request.service_name && request.service_name.toLowerCase().includes(searchTerm)) ||
            request.id.toString().includes(searchTerm)
        );
    }

    renderRequests();
}

function getStatusBadge(status) {
    const statusMap = {
        'New': 'status-new',
        'Pending': 'status-pending',
        'InProgress': 'status-in-progress',
        'Completed': 'status-completed',
        'Rejected': 'status-rejected'
    };

    const className = statusMap[status] || 'status-new';
    const displayText = status ? status.replace(/([A-Z])/g, ' $1').trim() : 'Unknown';

    return `<span class="status-badge ${className}">${displayText}</span>`;
}

function getPriorityBadge(priority) {
    const priorityMap = {
        'Low': 'priority-low',
        'Medium': 'priority-medium',
        'High': 'priority-high',
        'Urgent': 'priority-urgent'
    };

    const className = priorityMap[priority] || 'priority-medium';
    return `<span class="priority-badge ${className}">${priority || 'Medium'}</span>`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function viewRequest(id) {
    // Navigate to request detail page (to be created)
    window.location.href = `/request-details.html?id=${id}`;
}

function showError() {
    const tableBody = document.getElementById('requestsTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');

    loadingIndicator.style.display = 'none';
    tableContainer.style.display = 'none';
    emptyState.innerHTML = `
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to Load Requests</h3>
        <p>There was an error loading your requests. Please try again later.</p>
        <button class="btn-primary" onclick="loadRequests()" style="margin-top: 16px;">
            Retry
        </button>
    `;
    emptyState.style.display = 'block';
}
