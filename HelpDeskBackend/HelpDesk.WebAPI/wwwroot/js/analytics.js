// Analytics Dashboard JavaScript
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    loadServices();
    loadAnalytics();
});

async function loadServices() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/services', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const services = await response.json();
            const select = document.getElementById('serviceFilter');

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

async function loadAnalytics() {
    const period = document.getElementById('timePeriod').value;
    const serviceId = document.getElementById('serviceFilter').value;

    try {
        const token = localStorage.getItem('token');

        // Load overview metrics
        const overviewResponse = await fetch(`/api/analytics/overview?days=${period}${serviceId ? '&serviceId=' + serviceId : ''}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (overviewResponse.ok) {
            const data = await overviewResponse.json();
            updateMetrics(data);
            updateCharts(data);
            updateWorkflowTable(data.workflows || []);
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
        // Show mock data for demo
        loadMockData();
    }
}

function updateMetrics(data) {
    document.getElementById('totalRequests').textContent = data.total_requests || 0;
    document.getElementById('completedRequests').textContent = data.completed_requests || 0;
    document.getElementById('avgTime').textContent = (data.avg_completion_hours || 0).toFixed(1);
    document.getElementById('slaCompliance').textContent = (data.sla_compliance || 0) + '%';

    const completionRate = data.total_requests > 0
        ? ((data.completed_requests / data.total_requests) * 100).toFixed(1)
        : 0;
    document.getElementById('completedRate').textContent = completionRate + '% completion rate';
}

function initializeCharts() {
    // Status Distribution (Pie)
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    charts.status = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'In Progress', 'Pending', 'Rejected'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#28a745', '#ffc107', '#17a2b8', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Trend Chart (Line)
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Requests',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Services Chart (Bar)
    const servicesCtx = document.getElementById('servicesChart').getContext('2d');
    charts.services = new Chart(servicesCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Requests',
                data: [],
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Priority Chart (Doughnut)
    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    charts.priority = new Chart(priorityCtx, {
        type: 'doughnut',
        data: {
            labels: ['Low', 'Medium', 'High', 'Urgent'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#28a745', '#ffc107', '#fd7e14', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateCharts(data) {
    // Status chart
    if (data.by_status) {
        charts.status.data.datasets[0].data = [
            data.by_status.Completed || 0,
            data.by_status.InProgress || 0,
            data.by_status.Pending || 0,
            data.by_status.Rejected || 0
        ];
        charts.status.update();
    }

    // Trend chart
    if (data.trend) {
        charts.trend.data.labels = data.trend.map(t => t.date);
        charts.trend.data.datasets[0].data = data.trend.map(t => t.count);
        charts.trend.update();
    }

    // Services chart
    if (data.by_service) {
        charts.services.data.labels = data.by_service.map(s => s.service_name);
        charts.services.data.datasets[0].data = data.by_service.map(s => s.count);
        charts.services.update();
    }

    // Priority chart
    if (data.by_priority) {
        charts.priority.data.datasets[0].data = [
            data.by_priority.Low || 0,
            data.by_priority.Medium || 0,
            data.by_priority.High || 0,
            data.by_priority.Urgent || 0
        ];
        charts.priority.update();
    }
}

function updateWorkflowTable(workflows) {
    const tbody = document.getElementById('workflowTableBody');

    if (workflows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No workflow data available</td></tr>';
        return;
    }

    tbody.innerHTML = workflows.map(wf => `
        <tr>
            <td>${wf.name}</td>
            <td>${wf.total_requests}</td>
            <td>${wf.completed_requests}</td>
            <td>${wf.avg_duration_hours.toFixed(1)}h</td>
            <td>${wf.completion_rate.toFixed(1)}%</td>
            <td>
                <span class="status-badge ${wf.completion_rate >= 80 ? 'completed' : wf.completion_rate >= 50 ? 'in-progress' : 'pending'}">
                    ${wf.completion_rate >= 80 ? 'Excellent' : wf.completion_rate >= 50 ? 'Good' : 'Needs Attention'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Mock data for demo
function loadMockData() {
    const mockData = {
        total_requests: 245,
        completed_requests: 198,
        avg_completion_hours: 18.5,
        sla_compliance: 87,
        by_status: {
            Completed: 198,
            InProgress: 32,
            Pending: 15,
            Rejected: 0
        },
        trend: [
            { date: 'Week 1', count: 45 },
            { date: 'Week 2', count: 52 },
            { date: 'Week 3', count: 68 },
            { date: 'Week 4', count: 80 }
        ],
        by_service: [
            { service_name: 'Leave Request', count: 85 },
            { service_name: 'IT Support', count: 72 },
            { service_name: 'Purchase', count: 48 },
            { service_name: 'Training', count: 40 }
        ],
        by_priority: {
            Low: 98,
            Medium: 102,
            High: 35,
            Urgent: 10
        },
        workflows: [
            {
                name: 'Leave Approval',
                total_requests: 85,
                completed_requests: 78,
                avg_duration_hours: 12.3,
                completion_rate: 91.8
            },
            {
                name: 'IT Support',
                total_requests: 72,
                completed_requests: 65,
                avg_duration_hours: 24.1,
                completion_rate: 90.3
            },
            {
                name: 'Purchase Request',
                total_requests: 48,
                completed_requests: 35,
                avg_duration_hours: 48.5,
                completion_rate: 72.9
            }
        ]
    };

    updateMetrics(mockData);
    updateCharts(mockData);
    updateWorkflowTable(mockData.workflows);
}
