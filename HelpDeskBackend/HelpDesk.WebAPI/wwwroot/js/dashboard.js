// Check authentication
const token = checkAuth();
const user = getCurrentUser();

// Display user name
if (user) {
    document.getElementById('userName').textContent = user.full_name || user.email;
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load admin dashboard if user is admin
        if (user && (user.role === 'Admin' || user.role === 3)) {
            const response = await apiCall('/api/admin/dashboard');
            if (response.ok) {
                const data = await response.json();

                document.getElementById('totalRequests').textContent = data.total_requests;
                document.getElementById('activeRequests').textContent = data.active_requests;
                document.getElementById('completedRequests').textContent = data.completed_requests;
                document.getElementById('slaCompliance').textContent = data.sla_compliance_rate.toFixed(1) + '%';
            }
        } else {
            // Load user requests
            const response = await apiCall('/api/requests');
            if (response.ok) {
                const requests = await response.json();
                document.getElementById('totalRequests').textContent = requests.length;
                document.getElementById('activeRequests').textContent = requests.filter(r =>
                    r.status !== 'Completed' && r.status !== 'Rejected' && r.status !== 'Cancelled'
                ).length;
                document.getElementById('completedRequests').textContent = requests.filter(r =>
                    r.status === 'Completed'
                ).length;
                document.getElementById('slaCompliance').textContent = '--';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Show defaults
        document.getElementById('totalRequests').textContent = '0';
        document.getElementById('activeRequests').textContent = '0';
        document.getElementById('completedRequests').textContent = '0';
        document.getElementById('slaCompliance').textContent = '--%';
    }
}

// Load data on page load
loadDashboardData();

// Add hover effects to feature links
document.querySelectorAll('.feature-link').forEach(link => {
    link.addEventListener('mouseenter', (e) => {
        e.target.style.transform = 'translateY(-4px)';
        e.target.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
    });
    link.addEventListener('mouseleave', (e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = 'none';
    });
});
