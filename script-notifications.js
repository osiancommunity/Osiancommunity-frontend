document.addEventListener("DOMContentLoaded", function() {

const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    const notificationListContainer = document.getElementById('notification-list-container');

    async function fetchNotifications() {
        if (!notificationListContainer) return;

        try {
            const response = await fetch(`${backendUrl}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch notifications.');
            }

            const notifications = await response.json();
            displayNotifications(notifications);

        } catch (error) {
            console.error('Error fetching notifications:', error);
            notificationListContainer.innerHTML = '<p>Could not load notifications at this time.</p>';
        }
    }

    function displayNotifications(notifications) {
        notificationListContainer.innerHTML = ''; // Clear loader/error

        if (notifications.length === 0) {
            notificationListContainer.innerHTML = '<p>You have no new notifications.</p>';
            return;
        }

        notifications.forEach(notif => {
            const item = document.createElement('li');
            item.className = 'notification-item';
            item.innerHTML = `
                <h4>${notif.subject}</h4>
                <p>${notif.message}</p>
                <span class="timestamp">Received on: ${new Date(notif.createdAt).toLocaleString()}</span>
            `;
            notificationListContainer.appendChild(item);
        });
    }

    fetchNotifications();
});
