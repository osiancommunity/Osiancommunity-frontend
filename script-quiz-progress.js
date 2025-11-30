document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

    // --- User & Logout Logic ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    // Check if user is logged in
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Load user avatar from profile data
    const userData = JSON.parse(localStorage.getItem('osianUserData')) || {};
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar && userData.avatar) {
        headerAvatar.src = userData.avatar;
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

    // --- Page Elements ---
    const kpiAttempted = document.querySelector('.kpi-grid-user .kpi-card-user:nth-child(1) h2');
    const kpiPassed = document.querySelector('.kpi-grid-user .kpi-card-user:nth-child(2) h2');
    const kpiAvgScore = document.querySelector('.kpi-grid-user .kpi-card-user:nth-child(3) h2');
    const historyTableBody = document.querySelector('.quiz-history-table tbody');
    const regPrevBtn = document.getElementById('reg-prev');
    const regNextBtn = document.getElementById('reg-next');
    const regPageInfo = document.getElementById('reg-page-info');
    const histPrevBtn = document.getElementById('hist-prev');
    const histNextBtn = document.getElementById('hist-next');
    const histPageInfo = document.getElementById('hist-page-info');

    // --- Fetch User's Results ---
    let historyCurrentPage = 1;
    let historyTotalPages = 1;
    const historyPageSize = 10;

    async function fetchMyResults(page = 1) {
        if (!historyTableBody) return; // In case element isn't found
        historyTableBody.innerHTML = '<tr><td colspan="6">Loading your results...</td></tr>';

        try {
            const userId = user?._id;
            if (!userId) {
                throw new Error("User ID not found.");
            }

            // --- BACKEND CALL ---
            const response = await fetch(`${backendUrl}/results/user/${userId}?page=${page}&limit=${historyPageSize}`, {
                headers: {
                    'Authorization': `Bearer ${token}` // Send the user's token
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return; // Silently redirect
                }
                const data = await response.json();
                throw new Error(data.message);
            }

            const data = await response.json();
            const results = data.results || [];
            const pagination = data.pagination || { currentPage: page, totalPages: 1, totalResults: results.length };
            historyCurrentPage = pagination.currentPage || page;
            historyTotalPages = pagination.totalPages || 1;
            updateHistoryPagination();

            // Populate the page with the data
            populateStats(results);
            populateHistoryTable(results);

        } catch (error) {
            console.error('Error fetching results:', error);
            historyTableBody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
        }
    }

    // --- Fetch User's Registered Quizzes ---
    let registeredAll = [];
    let regCurrentPage = 1;
    let regTotalPages = 1;
    const regPageSize = 8;

    async function fetchMyRegisteredQuizzes() {
        try {
            const response = await fetch(`${backendUrl}/quizzes/user/registered`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                const data = await response.json();
                throw new Error(data.message);
            }

            const data = await response.json();
            registeredAll = data.quizzes || [];
            regTotalPages = Math.max(1, Math.ceil(registeredAll.length / regPageSize));
            regCurrentPage = 1;
            renderRegisteredPage();

        } catch (error) {
            console.error('Error fetching registered quizzes:', error);
            // Keep the existing logic for results if this fails
        }
    }

    // --- Function to Populate Stat Cards ---
    function populateStats(results) {
        const totalAttempts = results.length;
        
        // FIX: Ensure r.totalQuestions is not zero to avoid division by zero.
        const quizzesPassed = results.filter(r => 
            r.status === 'completed' && r.totalQuestions > 0 &&
            (r.score / r.totalQuestions) > 0.5
        ).length;

        // Calculate average score (only for completed quizzes)
        const completedQuizzes = results.filter(r => r.status === 'completed');
        let avgScore = 0;
        if (completedQuizzes.length > 0) {
            const totalScore = completedQuizzes.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0);
            avgScore = (totalScore / completedQuizzes.length) * 100;
        }

        // Update the HTML
        if(kpiAttempted) kpiAttempted.textContent = totalAttempts;
        if(kpiPassed) kpiPassed.textContent = quizzesPassed;
        if(kpiAvgScore) kpiAvgScore.textContent = `${avgScore.toFixed(0)}%`; // e.g., "82%"
    }

    // --- Helper Functions ---
    function getQuizStatus(quiz) {
        const now = new Date();
        const scheduleTime = quiz.scheduleTime ? new Date(quiz.scheduleTime) : null;

        if (quiz.status === 'completed') return 'Completed';
        if (quiz.status === 'active') return 'Live';
        if (quiz.quizType === 'live') return 'Live';
        if (scheduleTime && scheduleTime > now) return 'Upcoming';
        if (scheduleTime && scheduleTime <= now) return 'Live';
        return 'Draft';
    }

    function getStatusClass(status) {
        switch (status) {
            case 'Live': return 'active';
            case 'Upcoming': return 'active';
            case 'Completed': return 'active';
            case 'Draft': return 'inactive';
            default: return 'inactive';
        }
    }

    // --- Function to Populate Registered Quizzes ---
    function populateRegisteredQuizzes(quizzes) {
        const registeredQuizzesContainer = document.getElementById('registered-quizzes');

        if (!registeredQuizzesContainer) return;

        registeredQuizzesContainer.innerHTML = '';

        if (quizzes.length === 0) {
            registeredQuizzesContainer.innerHTML = '<p class="no-data">You have not registered for any quizzes yet.</p>';
            return;
        }

        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-card';

            const status = getQuizStatus(quiz);
            const statusClass = getStatusClass(status);
            const typeText = quiz.quizType === 'paid' ? 'Paid' : 'Free';
            const typeClass = quiz.quizType === 'paid' ? 'admin' : 'user';
            const scheduleTime = quiz.scheduleTime ? new Date(quiz.scheduleTime).toLocaleString() : 'Not Scheduled';
            const registeredUsers = quiz.registeredUsers || 0;
            const maxUsers = quiz.registrationLimit || '∞';

            quizCard.innerHTML = `
                <div class="quiz-card-header">
                    <h4>${quiz.title}</h4>
                    <span class="status-tag ${statusClass}">${status}</span>
                </div>
                <div class="quiz-card-body">
                    <div class="quiz-info">
                        <span class="category">${quiz.category}</span>
                        <span class="type-tag ${typeClass}">${typeText}</span>
                    </div>
                    <div class="quiz-details">
                        <p><strong>Schedule:</strong> ${scheduleTime}</p>
                        <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
                        <p><strong>Registered:</strong> ${registeredUsers} / ${maxUsers}</p>
                        ${quiz.quizType === 'paid' ? `<p><strong>Price:</strong> ₹${quiz.price}</p>` : ''}
                    </div>
                </div>
                <div class="quiz-card-actions">
                    ${status === 'Live' ? `<button class="btn-primary" onclick="startQuiz('${quiz._id}')">Start Quiz</button>` : ''}
                    ${status === 'Upcoming' ? `<button class="btn-secondary" onclick="viewQuizDetails('${quiz._id}')">View Details</button>` : ''}
                    ${status === 'Completed' ? `<button class="btn-secondary" onclick="viewResults('${quiz._id}')">View Results</button>` : ''}
                </div>
            `;

            registeredQuizzesContainer.appendChild(quizCard);
        });
    }

    function renderRegisteredPage() {
        const start = (regCurrentPage - 1) * regPageSize;
        const pageItems = registeredAll.slice(start, start + regPageSize);
        populateRegisteredQuizzes(pageItems);
        updateRegisteredPagination();
    }

    function updateRegisteredPagination() {
        if (regPageInfo) regPageInfo.textContent = `Page ${regCurrentPage} of ${regTotalPages}`;
        if (regPrevBtn) regPrevBtn.disabled = regCurrentPage === 1;
        if (regNextBtn) regNextBtn.disabled = regCurrentPage === regTotalPages;
    }

    function updateHistoryPagination() {
        if (histPageInfo) histPageInfo.textContent = `Page ${historyCurrentPage} of ${historyTotalPages}`;
        if (histPrevBtn) histPrevBtn.disabled = historyCurrentPage === 1;
        if (histNextBtn) histNextBtn.disabled = historyCurrentPage === historyTotalPages;
    }

    // --- Function to Populate History Table ---
    function populateHistoryTable(results) {
        const historyTableBody = document.getElementById('quiz-history-body');

        if (!historyTableBody) return;

        historyTableBody.innerHTML = ''; // Clear loading message

        if (results.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="6">You have not attempted any quizzes yet.</td></tr>';
            return;
        }

        results.forEach(result => {
            const row = document.createElement('tr');

            // Format the date
            const attemptedDate = new Date(result.completedAt).toLocaleDateString();

            // Determine score and result tag
            let scoreText = '--';
            let resultTag = `<span class="result-tag pending">${result.status === 'pending' ? 'Pending' : result.status}</span>`;

            if (result.status === 'completed') {
                scoreText = `${result.score ?? 0} / ${result.totalQuestions ?? 0}`;
                const pass = result.totalQuestions > 0 && ((result.score / result.totalQuestions) > 0.5);
                resultTag = pass
                    ? `<span class="result-tag pass">Pass</span>`
                    : `<span class="result-tag fail">Fail</span>`;
            } else if (result.status === 'failed_security') {
                resultTag = `<span class="result-tag fail">Auto-Submitted</span>`;
            }

            row.innerHTML = `
                <td>${result.quizId ? result.quizId.title : 'Quiz Deleted'}</td>
                <td>${result.quizId ? result.quizId.category : 'N/A'}</td>
                <td>${result.quizId ? result.quizId.quizType : 'N/A'}</td>
                <td>${attemptedDate}</td>
                <td>${scoreText}</td>
                <td>${resultTag}</td>
            `;
            historyTableBody.appendChild(row);
        });
    }

    // --- Pagination Events ---
    if (regPrevBtn) regPrevBtn.addEventListener('click', () => { if (regCurrentPage > 1) { regCurrentPage--; renderRegisteredPage(); } });
    if (regNextBtn) regNextBtn.addEventListener('click', () => { if (regCurrentPage < regTotalPages) { regCurrentPage++; renderRegisteredPage(); } });
    if (histPrevBtn) histPrevBtn.addEventListener('click', () => { if (historyCurrentPage > 1) { fetchMyResults(historyCurrentPage - 1); } });
    if (histNextBtn) histNextBtn.addEventListener('click', () => { if (historyCurrentPage < historyTotalPages) { fetchMyResults(historyCurrentPage + 1); } });

    // --- Global Functions for Buttons ---
    window.startQuiz = function(quizId) {
        window.location.href = `quiz.html?id=${quizId}`;
    };

    window.viewQuizDetails = function(quizId) {
        // Implement view quiz details functionality
        alert('View quiz details functionality to be implemented');
    };

    window.viewResults = function(quizId) {
        window.location.href = `quiz-results.html?quizId=${quizId}`;
    };

    // --- Initial Page Load ---
    fetchMyResults();
    fetchMyRegisteredQuizzes();

});
