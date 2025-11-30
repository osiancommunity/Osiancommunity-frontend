document.addEventListener("DOMContentLoaded", function() {

    // Ensure modal is hidden on page load
    const notificationModal = document.getElementById('notification-modal');
    if (notificationModal) {
        notificationModal.classList.remove('active');
    }

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

    // --- Elements ---
    const searchInput = document.getElementById('search-input');
    const quizFilter = document.getElementById('quiz-filter');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const resultsSummary = document.getElementById('results-summary');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');

    let currentPage = 1;
    let totalPages = 1;
    let allResults = [];
    let filteredResults = [];
    let allQuizzes = [];

    // Get quiz ID from URL if specified
    const urlParams = new URLSearchParams(window.location.search);
    const selectedQuizId = urlParams.get('quizId');

    // --- Fetch Admin's Quizzes ---
    async function fetchMyQuizzes() {
        try {
            const response = await fetch(`${backendUrl}/quizzes/admin`, {
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
                throw new Error('Failed to fetch quizzes');
            }

            const data = await response.json();
            allQuizzes = data.quizzes || [];

            // Populate quiz filter dropdown
            populateQuizFilter();

            // Fetch results based on selected quiz or all results
            if (selectedQuizId) {
                quizFilter.value = selectedQuizId;
                fetchQuizResults(selectedQuizId);
            } else {
                fetchAllResults();
            }
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            alert('Failed to load quizzes. Please try again.');
        }
    }

    // --- Populate Quiz Filter ---
    function populateQuizFilter() {
        quizFilter.innerHTML = '<option value="all">All Quizzes</option>';
        allQuizzes.forEach(quiz => {
            const option = document.createElement('option');
            option.value = quiz._id;
            option.textContent = quiz.title;
            quizFilter.appendChild(option);
        });
    }

    // --- Fetch Results for All Quizzes ---
async function fetchAllResults() {
    try {
        const response = await fetch(`${backendUrl}/results/admin`, {
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
            const errorText = await response.text();
            console.error('Failed response text:', errorText);
            throw new Error(`Failed to fetch results: ${response.status}`);
        }

        const data = await response.json();
        allResults = data.results || [];
        filteredResults = [...allResults];
        sortResults && sortResults();
        renderResults();
        renderSummary();
        renderSummary();
    } catch (error) {
        console.error('Error fetching results:', error);
        resultsTableBody.innerHTML = '<tr><td colspan="8">Error loading results. Please try again.</td></tr>';
    }
}

    // --- Fetch Results for Specific Quiz ---
    async function fetchQuizResults(quizId) {
        try {
            const response = await fetch(`${backendUrl}/results/quiz/${quizId}`, {
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
                throw new Error('Failed to fetch quiz results');
            }

        const data = await response.json();
        allResults = data.results || [];
        filteredResults = [...allResults];
        sortResults();
        renderResults();
        renderSummary();
        } catch (error) {
            console.error('Error fetching quiz results:', error);
            resultsTableBody.innerHTML = '<tr><td colspan="7">Error loading quiz results. Please try again.</td></tr>';
        }
    }

    // --- Render Results ---
    function renderResults() {
        const startIndex = (currentPage - 1) * 10;
        const endIndex = startIndex + 10;
        const resultsToShow = filteredResults.slice(startIndex, endIndex);

        resultsTableBody.innerHTML = '';
 
        if (resultsToShow.length === 0) {
            resultsTableBody.innerHTML = '<tr><td colspan="8">No results found.</td></tr>';
            updatePagination(); // Still update pagination to show "Page 0 of 0" or similar
            return;
        }

        resultsToShow.forEach(result => {
            const row = document.createElement('tr');

            // FIX: Safely access nested properties that might not exist.
            const score = result.score ?? 0;
            const totalQuestions = result.totalQuestions ?? 1;
            const percentage = ((score / totalQuestions) * 100).toFixed(1);
            const status = result.status === 'completed' ? 'Completed' : (result.status === 'pending' ? 'Pending' : 'In Progress');
            const completedAt = result.completedAt ? new Date(result.completedAt).toLocaleDateString() : '--';

            row.innerHTML = `
                <td><input type="checkbox" class="result-checkbox" data-result-id="${result._id}" data-user-id="${result.userId ? result.userId._id : ''}" data-quiz-title="${result.quizId ? (result.quizId.title || '') : ''}"></td>
                <td>${result.userId ? result.userId.name : 'Unknown'}</td>
                <td>${result.userId ? result.userId.email : 'Unknown'}</td>
                <td>${score} / ${totalQuestions}</td>
                <td>${percentage}%</td>
                <td><span class="status-tag ${result.status === 'completed' ? 'active' : 'inactive'}">${status}</span></td>
                <td>${completedAt}</td>
                <td>
                    <button class="btn-edit" onclick="viewDetailedResult(\`${result._id}\`)">View Details</button>
                </td>
            `;

            resultsTableBody.appendChild(row);
        });

        updatePagination();
    }

    function sortResults() {
        filteredResults.sort((a, b) => {
            const sa = a.score ?? 0;
            const sb = b.score ?? 0;
            if (sb !== sa) return sb - sa;
            const ta = a.timeTaken ?? Number.MAX_SAFE_INTEGER;
            const tb = b.timeTaken ?? Number.MAX_SAFE_INTEGER;
            if (ta !== tb) return ta - tb;
            const ca = new Date(a.completedAt || 0).getTime();
            const cb = new Date(b.completedAt || 0).getTime();
            return cb - ca;
        });
    }

    // --- Render Summary Stats ---
    function renderSummary() {
        const totalParticipants = filteredResults.length;
        const completedResults = filteredResults.filter(r => r.status === 'completed');
        const averageScore = completedResults.length > 0 
            ? (completedResults.reduce((acc, r) => acc + ((r.score / r.totalQuestions) * 100), 0) / completedResults.length).toFixed(1)
            : 0;
        const passRate = completedResults.length > 0 
            ? ((completedResults.filter(r => r.totalQuestions > 0 && (r.score / r.totalQuestions) >= 0.5).length / completedResults.length) * 100).toFixed(1)
            : 0;
 
        resultsSummary.innerHTML = `
            <div class="kpi-card">
                <div class="card-icon blue">
                    <i class='bx bx-user-check'></i>
                </div>
                <div class="card-info">
                    <h2>${totalParticipants}</h2>
                    <p>Total Participants</p>
                </div>
            </div>
            <div class="kpi-card">
                <div class="card-icon green">
                    <i class='bx bx-check-double'></i>
                </div>
                <div class="card-info">
                    <h2>${completedResults.length}</h2>
                    <p>Completed Attempts</p>
                </div>
            </div>
            <div class="kpi-card">
                <div class="card-icon purple">
                    <i class='bx bx-bar-chart-alt-2'></i>
                </div>
                <div class="card-info">
                    <h2>${averageScore}%</h2>
                    <p>Average Score</p>
                </div>
            </div>
            <div class="kpi-card">
                <div class="card-icon orange">
                    <i class='bx bx-trending-up'></i>
                </div>
                <div class="card-info">
                    <h2>${passRate}%</h2>
                    <p>Pass Rate</p>
                </div>
            </div>
        `;
    }

    // --- Helper Functions ---
    function updatePagination() {
        totalPages = Math.ceil(filteredResults.length / 10);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
 
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filteredResults = allResults.filter(result =>
            (result.userId && result.userId.name.toLowerCase().includes(searchTerm)) ||
            (result.userId && result.userId.email.toLowerCase().includes(searchTerm))
        );
        currentPage = 1;
        sortResults();
        renderResults();
        renderSummary();
    });

    quizFilter.addEventListener('change', function() {
        const quizId = this.value;
        if (quizId === 'all') {
            fetchAllResults();
        } else {
            fetchQuizResults(quizId);
        }
    });

    prevBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderResults();
        }
    });

    nextBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderResults();
        }
    });

    // --- Release Results and Send Notifications ---
    async function releaseResults() {
        const selectedCheckboxes = document.querySelectorAll('.result-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Please select at least one result to release.');
            return;
        }

        const resultIds = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-result-id'));
        const userIdsForNotify = Array.from(selectedCheckboxes)
            .map(cb => cb.getAttribute('data-user-id'))
            .filter(id => !!id);
        const sendNotifyCheckbox = document.getElementById('release-send-notify');
        const messageInput = document.getElementById('release-message');
        const shouldSendNotify = sendNotifyCheckbox ? sendNotifyCheckbox.checked : true;
        const rawMessage = (messageInput && messageInput.value.trim()) || 'Your quiz results have been released for {{quizTitle}} on {{releaseDate}}.';

        try {
            const response = await fetch(`${backendUrl}/results/release`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ resultIds })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to release results:', response.status, errorText);
                throw new Error(`Failed to release results: ${response.status}`);
            }

            alert('Results released successfully!');

            // Auto-send notifications to selected users (optional)
            if (shouldSendNotify && userIdsForNotify.length > 0) {
                const dateStr = new Date().toLocaleString();
                const admin = JSON.parse(localStorage.getItem('user')) || {};
                const adminName = admin && admin.name ? admin.name : 'Admin';
                // Derive a quiz title: if filter set to a single quiz, use it; else pick first selected checkbox title or 'Selected Quizzes'
                const filterEl = document.getElementById('quiz-filter');
                let quizTitle = 'Selected Quizzes';
                if (filterEl && filterEl.value && filterEl.value !== 'all') {
                    const q = allQuizzes.find(q => q._id === filterEl.value);
                    quizTitle = q ? (q.title || quizTitle) : quizTitle;
                } else {
                    const firstCb = document.querySelector('.result-checkbox:checked');
                    const t = firstCb ? firstCb.getAttribute('data-quiz-title') : '';
                    quizTitle = t || quizTitle;
                }
                const finalMessage = renderTemplate(rawMessage, { quizTitle, releaseDate: dateStr, adminName });
                try {
                    const notifyRes = await fetch(`${backendUrl}/notifications/send-result`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            userIds: userIdsForNotify,
                            message: finalMessage
                        })
                    });
                    if (!notifyRes.ok) {
                        const errText = await notifyRes.text();
                        console.warn('Notification send failed:', errText);
                    }
                } catch (e) {
                    console.warn('Notification send error:', e);
            }
    }
            // Refresh the results
            if (quizFilter.value === 'all') {
                fetchAllResults();
            } else {
                fetchQuizResults(quizFilter.value);
            }
        } catch (error) {
            console.error('Error releasing results:', error);
            alert(`Failed to release results: ${error.message}. Please try again.`);
        }
    }

    async function sendNotification() {
        const selectedCheckboxes = document.querySelectorAll('.result-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Please select at least one user to notify.');
            return;
        }

        const userIds = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-user-id')).filter(id => id);

        if (userIds.length === 0) {
            alert('No valid users selected for notification.');
            return;
        }

        // Show modal for notification message
        const modal = document.getElementById('notification-modal');
        const messageTextarea = document.getElementById('notification-message');
        const sendBtn = document.getElementById('send-notification-btn');
        const closeBtn = document.querySelector('#notification-modal .close');

        messageTextarea.value = '';
        modal.classList.add('active');

        // Handle send button
        const handleSend = async () => {
            const notificationMessage = messageTextarea.value.trim();
            if (!notificationMessage) {
                alert('Please enter a notification message.');
                return;
            }

            modal.classList.remove('active');

            try {
                const dateStr = new Date().toLocaleString();
                const admin = JSON.parse(localStorage.getItem('user')) || {};
                const adminName = admin && admin.name ? admin.name : 'Admin';
                let quizTitle = 'Selected Quizzes';
                const filterEl = document.getElementById('quiz-filter');
                if (filterEl && filterEl.value && filterEl.value !== 'all') {
                    const q = allQuizzes.find(q => q._id === filterEl.value);
                    quizTitle = q ? (q.title || quizTitle) : quizTitle;
                } else {
                    const firstCb = document.querySelector('.result-checkbox:checked');
                    const t = firstCb ? firstCb.getAttribute('data-quiz-title') : '';
                    quizTitle = t || quizTitle;
                }
                const finalMessage = renderTemplate(notificationMessage, { quizTitle, releaseDate: dateStr, adminName });
                const response = await fetch(`${backendUrl}/notifications/send-result`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userIds,
                        message: finalMessage
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to send notification');
                }

                alert('Notification sent successfully!');
            } catch (error) {
                console.error('Error sending notification:', error);
                alert('Failed to send notification. Please try again.');
            }
        };

        sendBtn.onclick = handleSend;

        // Handle cancel button
        const cancelBtn = document.getElementById('cancel-notification-btn');
        cancelBtn.onclick = () => {
            modal.classList.remove('active');
        };

        // Handle close button
        closeBtn.onclick = () => {
            modal.classList.remove('active');
        };

        // Close modal when clicking outside
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.classList.remove('active');
            }
        };
    }

    // Select all checkbox functionality
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.result-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }

    document.getElementById('release-btn').addEventListener('click', releaseResults);
    document.getElementById('notify-btn').addEventListener('click', sendNotification);

    // --- Global Functions for Buttons ---
    window.viewDetailedResult = async function(resultId) {
        const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
        const token = localStorage.getItem('token');
        const modal = document.getElementById('result-modal');
        const modalBody = document.getElementById('result-modal-body');
        const modalTitle = document.getElementById('result-modal-title');
        const closeBtn = document.getElementById('result-modal-close');

        try {
            const response = await fetch(`${backendUrl}/results/${resultId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Failed to load result details');
            }
            const data = await response.json();
            const r = data.result || data;

            const score = r.score ?? 0;
            const totalQuestions = r.totalQuestions ?? 1;
            const percentage = ((score / totalQuestions) * 100).toFixed(1);
            const status = r.status === 'completed' ? 'Completed' : (r.status === 'pending' ? 'Pending' : 'In Progress');

            modalTitle.textContent = r.quizId && r.quizId.title ? `Result: ${r.quizId.title}` : 'Result Details';
            modalBody.innerHTML = `
                <div class="result-details-grid">
                    <div><strong>Name:</strong> ${r.userId ? r.userId.name : 'Unknown'}</div>
                    <div><strong>Email:</strong> ${r.userId ? r.userId.email : 'Unknown'}</div>
                    <div><strong>Score:</strong> ${score} / ${totalQuestions}</div>
                    <div><strong>Percentage:</strong> ${percentage}%</div>
                    <div><strong>Status:</strong> ${status}</div>
                    <div><strong>Time Taken:</strong> ${r.timeTaken ?? '--'}s</div>
                    <div><strong>Completed:</strong> ${r.completedAt ? new Date(r.completedAt).toLocaleString() : '--'}</div>
                </div>
                <div class="result-answers">
                    <h4>Answers</h4>
                    ${Array.isArray(r.answers) && r.answers.length ? r.answers.map((a, idx) => {
                        const correct = a.isCorrect || a.correct;
                        return `<div class="answer-item ${correct ? 'correct' : 'wrong'}"><span>Q${idx+1}</span><span>${correct ? 'Correct' : 'Wrong'}</span></div>`;
                    }).join('') : '<p>No answer details available.</p>'}
                </div>
            `;

            if (modal) modal.classList.add('active');
            if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
            window.onclick = (event) => { if (event.target === modal) modal.classList.remove('active'); };
        } catch (e) {
            alert(`Failed to open result: ${e.message}`);
        }
    };

    // --- Initial Load ---
    fetchMyQuizzes();
});
    function renderTemplate(tpl, ctx) {
        return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, function(_, key){
            return (ctx && key in ctx) ? ctx[key] : '';
        });
    }
