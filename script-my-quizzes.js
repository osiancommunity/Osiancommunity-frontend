document.addEventListener("DOMContentLoaded", function() {

    function showToast(message, type){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast ' + (type || '');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
    }

    // Define the location of your backend
const backendUrl = (location.hostname.endsWith('vercel.app'))
  ? 'https://osiancommunity-backend.vercel.app/api'
  : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://osiancommunity-backend.vercel.app/api');

    // --- User & Logout Logic ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Check if user is logged in
    if (!token || !user) {
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
            window.location.href = 'index.html';
        });
    }

    // --- Elements ---
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const quizzesTableBody = document.querySelector('#quizzes-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');

    let currentPage = 1;
    let totalPages = 1;
    let allQuizzes = [];
    let filteredQuizzes = [];

    // --- Fetch Admin's Quizzes ---
    async function fetchMyQuizzes() {
        try {
            const response = await fetch(`${backendUrl}/quizzes/admin`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                const text = await response.text();
                console.error(`Fetch failed with status ${response.status}: ${text}`);
                throw new Error(`Failed to fetch quizzes: ${response.status}`);
            }

            const data = await response.json();
            allQuizzes = data.quizzes || [];
            filteredQuizzes = [...allQuizzes];
            renderQuizzes();
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            quizzesTableBody.innerHTML = '<tr><td colspan="8">Error loading quizzes. Please try again.</td></tr>';
        }
    }

    // --- Render Quizzes ---
    function renderQuizzes() {
        const startIndex = (currentPage - 1) * 10;
        const endIndex = startIndex + 10;
        const quizzesToShow = filteredQuizzes.slice(startIndex, endIndex);

        quizzesTableBody.innerHTML = '';

        if (quizzesToShow.length === 0) {
            quizzesTableBody.innerHTML = '<tr><td colspan="8">No quizzes found.</td></tr>';
            return;
        }

            quizzesToShow.forEach(quiz => {
                const row = document.createElement('tr');

                const statusClass = getStatusClass(quiz.status);
                const statusText = quiz.status ? quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1) : 'Unknown';
                const typeText = quiz.quizType === 'paid' ? 'Paid' : (quiz.quizType === 'live' ? 'Live' : (quiz.quizType === 'upcoming' ? 'Upcoming' : 'Regular'));
                const registeredUsers = quiz.registeredUsers || 0;
                const scheduleTime = quiz.scheduleTime ? new Date(quiz.scheduleTime).toLocaleString() : '--';
                const createdDate = quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : '--';
                const isUnlisted = String(quiz.visibility || '').toLowerCase() === 'unlisted';

                row.innerHTML = `
                    <td>${quiz.title}</td>
                    <td>${quiz.category}</td>
                    <td><span class="role-tag ${typeText === 'Paid' ? 'admin' : 'user'}">${typeText}</span></td>
                    <td>${registeredUsers}${quiz.registrationLimit ? ` / ${quiz.registrationLimit}` : ''}</td>
                    <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                    <td>${scheduleTime}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="btn-edit" onclick="viewQuiz('${quiz._id}')">View</button>
                        <button class="btn-edit" onclick="editQuiz('${quiz._id}')">Edit</button>
                        <button class="btn-edit" onclick="viewResults('${quiz._id}')">Results</button>
                        <button class="btn-delete" onclick="deleteQuiz('${quiz._id}')">Delete</button>
                        ${isUnlisted ? `<button class="btn-edit" onclick="copyQuizLink('${quiz._id}','${quiz.quizType}')">Copy Link</button>` : ''}
                    </td>
                `;

                quizzesTableBody.appendChild(row);
            });

        updatePagination();
    }

    // --- Helper Functions ---
    function getStatusClass(status) {
        if (!status) return 'inactive';
        switch (status.toLowerCase()) {
            case 'active': return 'active';
            case 'upcoming': return 'active';
            case 'draft': return 'inactive';
            case 'completed': return 'active';
            default: return 'inactive';
        }
    }

    function updatePagination() {
        totalPages = Math.ceil(filteredQuizzes.length / 10);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filteredQuizzes = allQuizzes.filter(quiz =>
            quiz.title.toLowerCase().includes(searchTerm) ||
            quiz.category.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        renderQuizzes();
    });

    statusFilter.addEventListener('change', function() {
        const status = this.value;
        if (status === 'all') {
            filteredQuizzes = [...allQuizzes];
        } else {
            filteredQuizzes = allQuizzes.filter(quiz => quiz.status === status);
        }
        currentPage = 1;
        renderQuizzes();
    });

    prevBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderQuizzes();
        }
    });

    nextBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderQuizzes();
        }
    });

    // --- Global Functions for Buttons ---
    window.viewQuiz = function(quizId) {
        // Implement view quiz details
        showToast('View quiz details coming soon.', 'info');
    };

    window.editQuiz = function(quizId) {
        window.location.href = `create-quiz.html?edit=${quizId}`;
    };

    window.viewResults = function(quizId) {
        window.location.href = `quiz-results.html?quizId=${quizId}`;
    };

    window.copyQuizLink = async function(quizId, quizType){
        try {
            const dest = (String(quizType || '').toLowerCase() === 'paid')
                ? `payment.html?quizId=${quizId}`
                : `quiz.html?id=${quizId}`;
            const base = location.origin.replace(/\/$/, '');
            const link = `${base}/${dest}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
            } else {
                const tmp = document.createElement('input');
                tmp.value = link;
                document.body.appendChild(tmp);
                tmp.select();
                document.execCommand('copy');
                document.body.removeChild(tmp);
            }
            showToast('Unlisted quiz link copied to clipboard.', 'success');
        } catch (e) {
            showToast('Failed to copy link. Please try again.', 'error');
        }
    };

    function showToastConfirm(message, onConfirm){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast warning';
        el.innerHTML = `${message} <span class="actions"><button id="toast-confirm">Confirm</button> <button id="toast-cancel">Cancel</button></span>`;
        el.classList.add('show');
        const confirmBtn = document.getElementById('toast-confirm');
        const cancelBtn = document.getElementById('toast-cancel');
        const hide = ()=>{ el.classList.remove('show'); el.innerHTML=''; };
        if (confirmBtn) confirmBtn.onclick = function(){ hide(); if (onConfirm) onConfirm(); };
        if (cancelBtn) cancelBtn.onclick = function(){ hide(); };
    }

    window.deleteQuiz = async function(quizId) {
        showToastConfirm('Delete this quiz? This action cannot be undone.', async function(){
            try {
                const response = await fetch(`${backendUrl}/quizzes/${quizId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        showToast('Access denied. Please log in again.', 'warning');
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        window.location.href = 'login.html';
                        return;
                    }
                    throw new Error('Failed to delete quiz');
                }

                showToast('Quiz deleted successfully.', 'success');
                fetchMyQuizzes(); // Refresh the list
            } catch (error) {
                console.error('Error deleting quiz:', error);
                showToast('Failed to delete quiz. Please try again.', 'error');
            }
        });
    };

    // --- Initial Load ---
    fetchMyQuizzes();
});
