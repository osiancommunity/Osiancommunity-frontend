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
            window.location.href = 'index.html';
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
                try {
                    const data = await response.json();
                    if (response.status === 403) {
                        showToast(data && data.message ? data.message : 'Access denied or not available yet.', 'warning');
                        return;
                    }
                    if (response.status === 401) {
                        showToast(data && data.message ? data.message : 'Unable to load your registered quizzes right now.', 'warning');
                        return;
                    }
                    throw new Error(data.message || 'Failed to fetch registered quizzes');
                } catch (e) {
                    throw e;
                }
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
                if (response.status === 401) {
                    showToast('Unable to load your registered quizzes right now.', 'warning');
                    return;
                }
                if (response.status === 403) {
                    showToast('Access denied or not available yet.', 'warning');
                    return;
                }
                const data = await response.json();
                throw new Error(data.message);
            }

            const data = await response.json();
            registeredAll = data.quizzes || [];
            try { localStorage.setItem('osianRegisteredQuizzes', JSON.stringify(registeredAll)); } catch (_) {}
            regTotalPages = Math.max(1, Math.ceil(registeredAll.length / regPageSize));
            regCurrentPage = 1;
            renderRegisteredPage();
            scheduleRemindersForQuizzes(registeredAll);

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
            const scheduleDate = quiz.scheduleTime ? new Date(quiz.scheduleTime) : null;
            const scheduleTime = scheduleDate ? scheduleDate.toLocaleString() : 'Not Scheduled';
            const isUpcomingPaid = quiz.quizType === 'paid' && scheduleDate && scheduleDate.getTime() > Date.now();
            const startedPaid = quiz.quizType === 'paid' && scheduleDate && scheduleDate.getTime() <= Date.now();
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
                        <p><strong>${startedPaid ? 'Started' : (isUpcomingPaid ? 'Starts' : 'Schedule')}:</strong> ${scheduleTime}</p>
                        <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
                        <p><strong>Registered:</strong> ${registeredUsers} / ${maxUsers}</p>
                        ${quiz.quizType === 'paid' ? `<p><strong>Price:</strong> ₹${quiz.price}</p>` : ''}
                        ${isUpcomingPaid ? `<p><em>You will be notified 1 hour before start.</em></p>` : ''}
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

    function scheduleRemindersForQuizzes(quizzes) {
        const now = Date.now();
        quizzes.forEach(function(q){
            if (!q || q.quizType !== 'paid' || !q.scheduleTime) return;
            const startTs = new Date(q.scheduleTime).getTime();
            if (!startTs || isNaN(startTs)) return;
            const notifyAt = startTs - 3600000;
            const key = `quizReminder_${q._id}_${startTs}`;
            if (now >= notifyAt && now < startTs && !localStorage.getItem(key)) {
                showToast(`Reminder: "${q.title}" starts at ${new Date(startTs).toLocaleString()}`, 'info');
                try { localStorage.setItem(key, '1'); } catch (_) {}
            } else if (now < notifyAt) {
                const delay = notifyAt - now;
                if (delay > 0 && delay < 2147483647) {
                    setTimeout(function(){
                        if (!localStorage.getItem(key)) {
                            showToast(`Reminder: "${q.title}" starts at ${new Date(startTs).toLocaleString()}`, 'info');
                            try { localStorage.setItem(key, '1'); } catch (_) {}
                        }
                    }, delay);
                }
            }
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
        showToast('View quiz details coming soon.', 'info');
    };

    window.viewResults = function(quizId) {
        window.location.href = `quiz-results.html?quizId=${quizId}`;
    };

    // Leaderboard & Badges
    let lbSocket;
    async function fetchLeaderboardREST(scope, period) {
        try {
            const query = new URLSearchParams({ scope, period }).toString();
            const res = await fetch(`${backendUrl}/leaderboard?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) {
                // Fallback message
                const tbody = document.querySelector('#leaderboard-table tbody');
                if (tbody) tbody.innerHTML = '<tr><td colspan="4">Leaderboard not available</td></tr>';
                return;
            }
            const data = await res.json();
            renderLeaderboard(data.leaderboard || []);
        } catch (_) {}
    }
    function renderLeaderboard(list) {
        const hero = document.getElementById('lb-hero');
        const listEl = document.getElementById('lb-list');
        const mini = document.getElementById('lb-user-mini');
        if (!hero || !listEl) return;
        const top3 = list.slice(0,3);
        const rest = list.slice(3);
        hero.innerHTML = top3.map((x, i) => {
            const cls = i===0 ? 'lb-hero-card gold' : i===1 ? 'lb-hero-card silver' : 'lb-hero-card bronze';
            const img = x.avatar_url;
            const initials = (x.display_name || 'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
            const avatarEl = img ? `<img src="${img}" loading="lazy" alt="${x.display_name}" class="avatar">` : `<div class="initials avatar">${initials}</div>`;
            return `<div class="${cls}" role="button" tabindex="0" data-user="${x.user_id}"><div class="medal">${x.rank}</div>${avatarEl}<div class="name">${x.display_name || 'User'}</div><div class="meta">${x.college || ''}</div><div class="score">${Math.round(x.composite_score)}</div></div>`;
        }).join('');
        listEl.innerHTML = rest.map((x) => {
            const img = x.avatar_url;
            const initials = (x.display_name || 'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
            const avatarEl = img ? `<img src="${img}" loading="lazy" alt="${x.display_name}" class="avatar">` : `<div class="initials">${initials}</div>`;
            const spark = (x.sparkline || []).slice(0,20);
            const path = spark.map((v, idx) => `${idx===0?'M':'L'} ${idx*6} ${24 - Math.min(24, Math.max(0, v/5))}`).join(' ');
            const badges = (x.badges || []).map(b => `<div class="badge" title="${b.name}"><span class="badge-icon">🏅</span><span>${b.name}</span></div>`).join('');
            return `<div class="lb-row" data-user="${x.user_id}">${avatarEl}<div class="content"><div class="title">${x.rank}. ${x.display_name || 'User'}</div><div class="meta">Avg ${Math.round(x.avg_score)} • Attempts ${x.attempts}</div><svg class="spark" viewBox="0 0 120 24"><path d="${path}" stroke="#4C8DFF" fill="none" stroke-width="2"/></svg><div class="badges">${badges}</div></div></div>`;
        }).join('');
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const me = list.find(x => String(x.user_id) === String(user._id));
        if (me && me.rank > 3) {
            mini.classList.add('active');
            const delta = 0;
            const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '–';
            const img = me.avatar_url;
            const initials = (me.display_name || 'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
            const avatarEl = img ? `<img src="${img}" loading="lazy" alt="${me.display_name}" class="avatar" style="width:var(--avatar-sm);height:var(--avatar-sm);">` : `<div class="initials" style="width:var(--avatar-sm);height:var(--avatar-sm);">${initials}</div>`;
            mini.innerHTML = `${avatarEl}<div class="content"><div class="title">You • Rank ${me.rank}</div><div class="meta">${arrow} ${Math.round(me.composite_score)}</div></div><button class="btn-edit" id="mini-view">View profile</button>`;
            const btn = document.getElementById('mini-view');
            if (btn) btn.onclick = () => openProfileModal(me);
        } else {
            mini.classList.remove('active');
            mini.innerHTML = '';
        }
        hero.querySelectorAll('.lb-hero-card').forEach(el => { el.onclick = () => openProfileModal(top3.find(z => String(z.user_id)===String(el.dataset.user))); });
        listEl.querySelectorAll('.lb-row').forEach(el => { el.onclick = () => openProfileModal(rest.find(z => String(z.user_id)===String(el.dataset.user))); });
    }
    function connectLeaderboardWS(scope, period) {
        try {
            const url = new URL(window.location.href);
            const wsProto = url.protocol === 'https:' ? 'wss' : 'ws';
            const base = backendUrl.replace(/^http(s)?:\/\//,'');
            const host = base.split('/')[0];
            const ws = new WebSocket(`${wsProto}://${host}/ws/leaderboard?scope=${encodeURIComponent(scope)}&period=${encodeURIComponent(period)}`);
            lbSocket = ws;
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'leaderboard') animateLeaderboardUpdate(msg.leaderboard || []);
                } catch (_) {}
            };
            ws.onopen = () => {};
            ws.onerror = () => { try { ws.close(); } catch(_){}; /* fallback to polling */ startLbPolling(scope, period); };
            ws.onclose = () => { lbSocket = null; };
        } catch (_) { startLbPolling(scope, period); }
    }
    let lbPollTimer;
    function startLbPolling(scope, period) {
        if (lbPollTimer) clearInterval(lbPollTimer);
        fetchLeaderboardREST(scope, period);
        lbPollTimer = setInterval(() => fetchLeaderboardREST(scope, period), 15000);
    }

    function animateLeaderboardUpdate(list){
        const prev = window._lbLast || [];
        window._lbLast = list;
        renderLeaderboard(list);
    }

    function openProfileModal(item){
        const modal = document.getElementById('profile-modal');
        const close = document.getElementById('profile-close');
        const content = document.getElementById('profile-content');
        if (!modal || !content) return;
        content.innerHTML = `<div style="display:flex;gap:12px;align-items:center;"><img src="${item.avatar_url || ''}" onerror="this.style.display='none'" alt="${item.display_name}" style="width:${'var(--avatar-md)'};height:${'var(--avatar-md)'};border-radius:50%"><div><div style="font-weight:600">${item.display_name}</div><div style="color:#6b7380">${item.college || ''}</div></div></div><div style="margin-top:12px">Composite ${Math.round(item.composite_score)} • Avg ${Math.round(item.avg_score)} • Attempts ${item.attempts}</div><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${(item.badges||[]).map(b=>`<div class='badge'><span class='badge-icon'>🏅</span><span>${b.name}</span></div>`).join('')}</div>`;
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden','false');
        close.onclick = () => { modal.style.display='none'; modal.setAttribute('aria-hidden','true'); };
        modal.onclick = (e)=>{ if(e.target===modal){ close.click(); } };
    }

    const searchEl = document.getElementById('lb-search');
    if (searchEl) {
        searchEl.addEventListener('input', () => {
            const q = searchEl.value.toLowerCase();
            const list = (window._lbLast || []).filter(x => String(x.display_name||'').toLowerCase().includes(q));
            renderLeaderboard(list);
        });
    }

    async function fetchBadges() {
        try {
            const res = await fetch(`${backendUrl}/badges/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) {
                const row = document.getElementById('badges-row');
                if (row) row.innerHTML = '<div class="badge"><span class="badge-icon">ℹ️</span><span class="badge-name">No badges yet</span></div>';
                return;
            }
            const data = await res.json();
            const row = document.getElementById('badges-row');
            if (!row) return;
            row.innerHTML = (data.badges || []).map(b => `<div class="badge" title="${b.description}"><span class="badge-icon">${b.icon || '🏅'}</span><span class="badge-name">${b.name}</span></div>`).join('');
        } catch (_) {}
    }

    // --- Initial Page Load ---
    fetchMyResults();
    fetchMyRegisteredQuizzes();
    const lbScope = document.getElementById('lb-scope');
    const lbPeriod = document.getElementById('lb-period');
    if (lbScope && lbPeriod) {
        const applyLb = () => {
            const scope = lbScope.value;
            const period = lbPeriod.value;
            fetchLeaderboardREST(scope, period);
            if (lbSocket) try { lbSocket.close(); } catch(_){}
            connectLeaderboardWS(scope, period);
        };
        lbScope.addEventListener('change', applyLb);
        lbPeriod.addEventListener('change', applyLb);
        applyLb();
    }
    fetchBadges();

});
