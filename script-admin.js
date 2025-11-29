document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend
const backendUrl = (location.hostname.endsWith('vercel.app')) ? 'https://osiancommunity-backend.vercel.app/api' : 'http://localhost:5000/api';

    // --- User & Logout Logic ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Security Check: Ensure user is logged in and is an admin
    if (!token || !user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        alert('Access Denied. You do not have permission to view this page.');
        window.location.href = 'login.html';
        return;
    }

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

    // --- Fetch and Display Recent Quizzes ---
    const recentQuizzesTableBody = document.querySelector('.user-table tbody');

    async function fetchRecentQuizzes() {
        try {
            // Fetch the most recent 4 quizzes created by the admin
            const response = await fetch(`${backendUrl}/quizzes/admin?limit=4`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch recent quizzes');

            const data = await response.json();
            recentQuizzesTableBody.innerHTML = ''; // Clear the static content

            if (!data.quizzes || data.quizzes.length === 0) {
                recentQuizzesTableBody.innerHTML = '<tr><td colspan="6">You have not created any quizzes yet.</td></tr>';
                return;
            }

            data.quizzes.forEach(quiz => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${quiz.title}</td>
                    <td>${quiz.category}</td>
                    <td><span class="role-tag ${quiz.quizType === 'paid' ? 'admin' : 'user'}">${quiz.quizType.charAt(0).toUpperCase() + quiz.quizType.slice(1)}</span></td>
                    <td>${quiz.registeredUsers || 0} / ${quiz.registrationLimit || '∞'}</td>
                    <td><span class="status-tag ${quiz.status === 'active' || quiz.status === 'upcoming' ? 'active' : 'inactive'}">${quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}</span></td>
                    <td><button class="btn-edit" onclick="window.location.href='quiz-results.html?quizId=${quiz._id}'">View Results</button></td>
                `;
                recentQuizzesTableBody.appendChild(row);
            });

        } catch (error) {
            console.error('Error fetching recent quizzes:', error);
            recentQuizzesTableBody.innerHTML = '<tr><td colspan="6">Error loading recent quizzes.</td></tr>';
        }
    }

    async function loadAdminKpis() {
        try {
            const res = await fetch(`${backendUrl}/analytics/admin-kpis`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            const k = data.kpis || {};
            const tq = document.getElementById('kpi-total-quizzes');
            const aq = document.getElementById('kpi-active-quizzes');
            const tp = document.getElementById('kpi-total-participants');
            const pq = document.getElementById('kpi-paid-quizzes');
            if (tq) tq.textContent = (k.totalQuizzesCreated || 0).toString();
            if (aq) aq.textContent = (k.activeQuizzes || 0).toString();
            if (tp) tp.textContent = (k.totalParticipants || 0).toString();
            if (pq) pq.textContent = (k.paidQuizzes || 0).toString();
        } catch(e) {
            console.error('Error loading KPIs:', e);
        }
    }

    // --- Initial Load ---
    loadAdminKpis();
    fetchRecentQuizzes();
});
