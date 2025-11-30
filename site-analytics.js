document.addEventListener("DOMContentLoaded", async function() {
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('token');
    let analyticsData = { months: [], userCount: [], categories: { labels: [], data: [], colors: [] } };
    try {
        const res = await fetch(`${backendUrl}/analytics/charts`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        analyticsData = data.charts || analyticsData;
    } catch(e) {}

    // --- Chart 1: User Registration Trend (Line Chart) ---
    const userChartCtx = document.getElementById('userChart').getContext('2d');
    new Chart(userChartCtx, {
        type: 'line',
        data: {
            labels: analyticsData.months,
            datasets: [{
                label: 'New Registrations',
                data: analyticsData.userCount,
                borderColor: '#4a00e0',
                backgroundColor: 'rgba(74, 0, 224, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    // --- Chart 2: Quiz Category Distribution (Doughnut Chart) ---
    const categoryChartCtx = document.getElementById('categoryChart').getContext('2d');
    new Chart(categoryChartCtx, {
        type: 'doughnut',
        data: {
            labels: analyticsData.categories.labels,
            datasets: [{
                data: analyticsData.categories.data,
                backgroundColor: analyticsData.categories.colors,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
});
