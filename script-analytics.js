document.addEventListener("DOMContentLoaded", function() {

const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!token || !user || user.role.toLowerCase() !== 'superadmin') {
        alert('Access Denied.');
        window.location.href = 'login.html';
        return;
    }

    const userChartCtx = document.getElementById('userChart')?.getContext('2d');
    const categoryChartCtx = document.getElementById('categoryChart')?.getContext('2d');

    // --- Chart Rendering Functions ---
    function renderUserChart(data) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labels = data.map(item => `${monthNames[item._id.month - 1]} ${item._id.year}`);
        const values = data.map(item => item.count);

        new Chart(userChartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'New User Registrations',
                    data: values,
                    borderColor: '#4A90E2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function renderCategoryChart(data) {
        const labels = data.map(item => item._id);
        const values = data.map(item => item.count);

        new Chart(categoryChartCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quiz Categories',
                    data: values,
                    backgroundColor: [
                        '#4A90E2', '#50E3C2', '#F5A623', '#BD10E0', '#7ED321', '#9013FE', '#F8E71C'
                    ],
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- Fetch Data ---
    async function fetchAnalyticsData() {
        if (!userChartCtx || !categoryChartCtx) return;

        try {
            const response = await fetch(`${backendUrl}/analytics/charts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch chart data');
            const data = await response.json();

            // Render charts
            renderUserChart(data.userTrend);
            renderCategoryChart(data.categoryDistribution);

            // Populate KPIs
            const kpiRevenue = document.querySelector('.kpi-card:nth-child(3) .card-info h2');
            if (kpiRevenue) {
                kpiRevenue.textContent = `₹${(data.totalRevenue || 0).toLocaleString()}`;
            }

        } catch (error) {
            console.error("Error fetching analytics data:", error);
        }
    }

    fetchAnalyticsData();
});
