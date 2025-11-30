document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend API
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('token');
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        user = null;
    }

    // --- 1. Security Check and Setup ---
    
    // --- FIX: Made the role check case-insensitive ---
    if (!token || !user || !user.role || user.role.toLowerCase() !== 'superadmin') {
        alert('Access Denied: You do not have permission to view this page.');
        window.location.replace('login.html'); // Redirect to login
        return;
    }
    
    // Display Super Admin Name
    const adminNameDisplay = document.querySelector('.header-profile span');
    if (adminNameDisplay) {
        adminNameDisplay.textContent = user.name || 'Super Admin';
    }

    // --- 2. Sidebar and Button Navigation Handler ---
    
    // Helper function to link elements
    function linkElement(selector, targetFile) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('click', (e) => {
                // If it's an anchor tag with a valid href, let it handle the redirect
                if (element.tagName === 'A' && element.getAttribute('href') !== '#') {
                    return; 
                }
                e.preventDefault();
                window.location.href = targetFile;
            });
        }
    }

    // Link all navigation elements:
    // (Assuming these links are correct for your file structure)
    linkElement('.sidebar-menu li:nth-child(2) a', 'user-management.html');      // User Management
    linkElement('.sidebar-menu li:nth-child(3) a', 'admin-management.html');      // Admin Management
    linkElement('.sidebar-menu li:nth-child(4) a', 'quiz-management-list.html'); // Quiz Management (List)
    linkElement('.sidebar-menu li:nth-child(5) a', 'create-notification.html');  // Notifications
    linkElement('.sidebar-menu li:nth-child(6) a', 'mentorship-videos-admin.html'); // Mentorship Videos
    linkElement('.sidebar-menu li:nth-child(7) a', 'contact-us-admin.html');      // Contact Us Page
    linkElement('.sidebar-menu li:nth-child(8) a', 'site-analytics.html');      // Site Analytics

    // Link "Create New Notification" button in the center panel
    linkElement('.content-card.medium.notification .btn-create.full-width', 'create-notification.html'); 

    // Link Content Management action buttons
    linkElement('.content-card.small button:nth-child(1)', 'mentorship-videos-admin.html'); // Edit Mentorship Videos
    linkElement('.content-card.small button:nth-child(2)', 'contact-us-admin.html');      // Update Contact Info

    // Handle Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // --- 3. Fetch Dashboard Statistics (KPIs) ---
    // (Existing code to fetch data and populate KPI cards goes here)
    
    const notificationList = document.querySelector('.notification-list');
    // Placeholder implementation for KPI functions:
    const kpiTotalUsers = document.querySelector('.kpi-card:nth-child(1) .card-info h2');
    const kpiTotalAdmins = document.querySelector('.kpi-card:nth-child(2) .card-info h2');
    const kpiLiveQuizzes = document.querySelector('.kpi-card:nth-child(3) .card-info h2');
    const kpiActiveUsers = document.querySelector('.kpi-card:nth-child(4) .card-info h2');

    function populateKPIs(data) {
        if (kpiTotalUsers) kpiTotalUsers.textContent = data.totalUsers.toLocaleString();
        if (kpiTotalAdmins) kpiTotalAdmins.textContent = data.totalAdmins;
        if (kpiLiveQuizzes) kpiLiveQuizzes.textContent = data.liveQuizzes;
        if (kpiActiveUsers) kpiActiveUsers.textContent = data.activeUsersNow;
    }

    async function fetchDashboardData() {
        try {
            const response = await fetch(`${backendUrl}/analytics/superadmin-kpis`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = 'login.html';
                }
                throw new Error('Failed to fetch dashboard data.');
            }

            const data = await response.json();
            populateKPIs(data);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            // Populate with zeros on error
            populateKPIs({ totalUsers: 0, totalAdmins: 0, liveQuizzes: 0, activeUsersNow: 0 });
        }
    }
    
    async function fetchRecentNotifications() {
        if (!notificationList) return;

        try {
            // Fetch the last 3-4 notifications
            const response = await fetch(`${backendUrl}/notifications?limit=3`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Could not fetch notifications');

            const notifications = await response.json();
            notificationList.innerHTML = ''; // Clear static content

            if (notifications.length === 0) {
                notificationList.innerHTML = '<li><p>No recent notifications found.</p></li>';
                return;
            }

            notifications.forEach(notif => {
                const li = document.createElement('li');
                const timeAgo = new Date(notif.createdAt).toLocaleDateString(); // Simple date
                li.innerHTML = `
                    <p><strong>${notif.subject}</strong> (To: ${notif.recipient})</p>
                    <span>${timeAgo}</span>
                `;
                notificationList.appendChild(li);
            });

        } catch (error) {
            console.error("Error fetching notifications:", error);
            notificationList.innerHTML = '<li><p>Error loading notifications.</p></li>';
        }
    }

    fetchDashboardData();
    fetchRecentNotifications();

});
