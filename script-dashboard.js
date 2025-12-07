document.addEventListener("DOMContentLoaded", function() {
    
    // Define the location of your backend
const backendUrl = (location.hostname.endsWith('vercel.app'))
  ? 'https://osiancommunity-backend.vercel.app/api'
  : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://osiancommunity-backend.vercel.app/api');

    // --- User & Logout Logic ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    // Check if user is logged in; allow local preview without redirect
    const isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    if (!token || !user) {
        if (!isLocal) {
            window.location.href = 'login.html';
            return;
        }
    }

    // Display user's name in the header
    const welcomeHeader = document.querySelector('.header-title h1');
    if (welcomeHeader) {
        welcomeHeader.textContent = `Welcome Back, ${user && user.name ? user.name : 'Kudoz Kundan'}!`;
    }

    // Load user avatar from profile data
    const userData = JSON.parse(localStorage.getItem('osianUserData')) || {};
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar && userData.avatar) {
        headerAvatar.src = userData.avatar;
    }
    
    // Handle Logout
    // Find all logout buttons (in sidebar and sidebar-footer)
    const logoutButtons = document.querySelectorAll('.logout-btn, .logout-direct');
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    });


    // KPIs
    async function fetchKpis() {
        try {
            const res = await fetch(`${backendUrl}/results/user`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();
            const results = data.results || [];
            const attempted = results.length;
            const passed = results.filter(r => r.passed).length;
            const avgPct = attempted > 0 ? Math.round(results.reduce((a,r)=>a + (r.totalQuestions>0 ? (r.score / r.totalQuestions) * 100 : 0), 0) / attempted) : 0;
            const accPct = avgPct; // accuracy equals percentage in current model
            const setCard = (id, value, label) => {
                const el = document.getElementById(id);
                if (el) { const h = el.querySelector('.card-info h2'); const p = el.querySelector('.card-info p'); if (h) h.textContent = value; if (p && label) p.textContent = label; }
            };
            setCard('kpi-attempted', attempted);
            setCard('kpi-passed', passed);
            setCard('kpi-avg-score', `${avgPct}%`);
            setCard('kpi-accuracy', `${accPct}%`);
        } catch (_) {}
    }

    // Registered Quizzes
    async function fetchRegisteredQuizzes() {
        try {
            const res = await fetch(`${backendUrl}/quizzes/user/registered`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();
            const rows = (data.quizzes || []).map(q => {
                const typeText = q.quizType === 'paid' ? 'Paid' : (q.quizType === 'live' ? 'Live' : (q.quizType === 'upcoming' ? 'Upcoming' : 'Regular'));
                return `<tr><td>${q.title}</td><td>${typeText}</td><td>${q.status}</td><td>${q.scheduleTime ? new Date(q.scheduleTime).toLocaleString() : '--'}</td></tr>`;
            }).join('');
            const tbody = document.querySelector('#registered-quizzes-table tbody');
            if (tbody) tbody.innerHTML = rows || '<tr><td colspan="4">No registrations yet.</td></tr>';
        } catch (_) {}
    }

    // History
    async function fetchHistory() {
        try {
            const res = await fetch(`${backendUrl}/results/user`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();
            const rows = (data.results || []).map(r => {
                const pct = r.totalQuestions > 0 ? Math.round((r.score / r.totalQuestions) * 100) : 0;
                return `<tr><td>${r.quizId?.title || '-'}</td><td>${r.score}/${r.totalQuestions}</td><td>${pct}%</td><td>${r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}</td></tr>`;
            }).join('');
            const tbody = document.querySelector('#quiz-history-table tbody');
            if (tbody) tbody.innerHTML = rows || '<tr><td colspan="4">No quiz history.</td></tr>';
        } catch (_) {}
    }

    // Leaderboard
    let lbSocket;
    async function fetchLeaderboardREST(scope, period) {
        try {
            const query = new URLSearchParams({ scope, period }).toString();
            const res = await fetch(`${backendUrl}/leaderboard?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return;
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
            const img = x.avatar_url || (x.user && x.user.avatar);
            const name = x.display_name || (x.user && x.user.name) || 'User';
            const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
            const avatarEl = img ? `<img src="${img}" loading="lazy" alt="${name}" class="avatar">` : `<div class="initials avatar">${initials}</div>`;
            const score = Math.round(x.composite_score || x.compositeScore || 0);
            return `<div class="${cls}" role="button" tabindex="0"><div class="medal">${x.rank}</div>${avatarEl}<div class="name">${name}</div><div class="meta">${x.college || ''}</div><div class="score">${score}</div></div>`;
        }).join('');
        listEl.innerHTML = rest.map((x) => {
            const img = x.avatar_url || (x.user && x.user.avatar);
            const name = x.display_name || (x.user && x.user.name) || 'User';
            const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
            const avatarEl = img ? `<img src="${img}" loading="lazy" alt="${name}" class="avatar">` : `<div class="initials">${initials}</div>`;
            const spark = (x.sparkline || []).slice(0,20);
            const path = spark.map((v, idx) => `${idx===0?'M':'L'} ${idx*6} ${24 - Math.min(24, Math.max(0, v/5))}`).join(' ');
            const score = Math.round(x.avg_score || x.avgScore || 0);
            const attempts = x.attempts || 0;
            const badges = (x.badges || []).map(b => `<div class="badge" title="${b.name}"><span class="badge-icon">🏅</span><span>${b.name}</span></div>`).join('');
            return `<div class="lb-row">${avatarEl}<div class="content"><div class="title">${x.rank}. ${name}</div><div class="meta">Avg ${score} • Attempts ${attempts}</div><svg class="spark" viewBox="0 0 120 24"><path d="${path}" stroke="#4C8DFF" fill="none" stroke-width="2"/></svg><div class="badges">${badges}</div></div></div>`;
        }).join('');
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const me = list.find(x => String((x.user_id||x.user?.id)) === String(user._id));
        if (me && me.rank > 3) {
            mini.classList.add('active');
            const score = Math.round(me.composite_score || me.compositeScore || 0);
            const img = me.avatar_url || (me.user && me.user.avatar);
            const name = me.display_name || (me.user && me.user.name) || 'User';
            const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
            const avatarEl = img ? `<img src="${img}" loading="lazy" alt="${name}" class="avatar" style="width:var(--avatar-sm);height:var(--avatar-sm);">` : `<div class="initials" style="width:var(--avatar-sm);height:var(--avatar-sm);">${initials}</div>`;
            mini.innerHTML = `${avatarEl}<div class="content"><div class="title">You • Rank ${me.rank}</div><div class="meta">${score}</div></div><a class="btn-edit" href="profile.html">View profile</a>`;
        } else { mini.classList.remove('active'); mini.innerHTML = ''; }
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
                    if (msg.type === 'leaderboard') renderLeaderboard(msg.leaderboard || []);
                } catch (_) {}
            };
            ws.onopen = () => {};
            ws.onerror = () => { try { ws.close(); } catch(_){}; startLbPolling(scope, period); };
            ws.onclose = () => { lbSocket = null; };
        } catch (_) { startLbPolling(scope, period); }
    }
    let lbPollTimer;
    function startLbPolling(scope, period) {
        if (lbPollTimer) clearInterval(lbPollTimer);
        fetchLeaderboardREST(scope, period);
        lbPollTimer = setInterval(() => fetchLeaderboardREST(scope, period), 15000);
    }
    async function fetchQuizzes() {
        try {
            const response = await fetch(`${backendUrl}/quizzes`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return; // Silently redirect
                }
                if (!isLocal) {
                    showErrorMessage(`Error fetching quizzes: ${data.message}`);
                    return;
                }
            }

            const categories = data.categories || {};
            const all = [
                ...(categories.technical || []),
                ...(categories.law || []),
                ...(categories.engineering || []),
                ...(categories.gk || []),
                ...(categories.sports || [])
            ];

            const recommended = pickTop(all, 6);
            if (recommended.length === 0 && isLocal) {
                renderIntoGrid(sampleQuizzes('Recommended'), 'recommended-quizzes-container');
            } else {
                renderIntoGrid(recommended, 'recommended-quizzes-container');
            }

        } catch (error) {
            console.error('Error fetching quizzes:', error);
            alert('Could not load quizzes. Server may be down.');
        }
    }
    
    function renderIntoGrid(quizzes, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!quizzes || quizzes.length === 0) return;
        quizzes.forEach(quiz => { container.innerHTML += createQuizCard(quiz); });
    }

    // --- NEW: Helper function to create a single quiz card with an image ---
    function createQuizCard(quiz) {
        const isPaid = quiz.quizType === 'paid';
        // The link depends on whether the quiz is paid or free
        const destinationUrl = isPaid ? `payment.html?quizId=${quiz._id}` : `quiz.html?id=${quiz._id}`;

        return `
            <div class="quiz-card">
                <img src="${quiz.coverImage || 'https://via.placeholder.com/320x200?text=No+Image'}" alt="${quiz.title}" class="quiz-card-img">
                <div class="quiz-card-header">
                    <span class="quiz-tag ${isPaid ? 'paid' : 'live'}">${isPaid ? 'Paid' : 'Free'}</span>
                    <span class="quiz-category">${quiz.category}</span>
                </div>
                <h3>${quiz.title}</h3>
                <p class="quiz-details">${quiz.description || 'No description available.'}</p>
                <div class="quiz-stats">
                    <span><i class='bx bx-user'></i> ${quiz.participants || 0} Participants</span>
                    <span><i class='bx bx-time'></i> ${quiz.duration || 30} Mins</span>
                </div>
                <button class="quiz-btn ${isPaid ? 'paid' : 'live'}" data-quiz-id="${quiz._id}" onclick="window.location.href='${destinationUrl}'">${isPaid ? `Register (₹${quiz.price ? quiz.price.toFixed(2) : 0})` : 'Join Now'}</button>
            </div>
        `;
    }

    function pickTop(list, count) {
        const arr = Array.isArray(list) ? [...list] : [];
        arr.sort((a,b) => (b.participants||0) - (a.participants||0));
        return arr.slice(0, count);
    }

    function sampleQuizzes(label) {
        return [
            { _id: 'demo1', quizType: 'free', title: `${label} Demo Quiz #1`, category: 'Technical', duration: 30, participants: 120, coverImage: '' },
            { _id: 'demo2', quizType: 'paid', title: `${label} Demo Quiz #2`, category: 'Engineering', duration: 45, participants: 200, price: 99, coverImage: '' },
            { _id: 'demo3', quizType: 'free', title: `${label} Demo Quiz #3`, category: 'General Knowledge', duration: 25, participants: 90, coverImage: '' }
        ];
    }

    function renderIntoScroll(quizzes, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!quizzes || quizzes.length === 0) return;
        quizzes.forEach(q => { container.innerHTML += createQuizCard(q); });
    }

    function getContinueLearning() {
        try {
            const raw = localStorage.getItem('recentQuizzes');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch { return []; }
    }

    const categoryGrid = document.getElementById('category-pills');
    if (categoryGrid) {
        categoryGrid.addEventListener('click', function(e){
            const card = e.target.closest('.category-card');
            if (!card) return;
            const cat = card.getAttribute('data-category');
            if (!cat) return;
            window.location.href = `category.html?category=${encodeURIComponent(cat)}`;
        });
    }

    // No filter or expand behavior on dashboard; categories route to dedicated pages.

    // Removed Top Categories rendering to keep dashboard minimal per spec.

    // --- Handle Quiz Registration Buttons ---
    async function getProfileCompleteness() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${backendUrl}/users/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return 0;
            const data = await res.json();
            const u = data.user || {};
            const p = u.profile || {};
            const required = [u.name, u.email, p.phone, p.city, p.college, p.course, p.state];
            const filled = required.filter(v => v && String(v).trim().length > 0).length;
            return Math.round((filled / required.length) * 100);
        } catch (_) {
            return 0;
        }
    }

    document.addEventListener('click', async function(e) {
        if (e.target.classList.contains('quiz-btn') && e.target.classList.contains('paid')) {
            e.preventDefault();
            const quizId = e.target.getAttribute('data-quiz-id');
            if (quizId) {
                const pct = await getProfileCompleteness();
                if (pct < 100) {
                    alert('Please complete your profile 100% before purchasing paid quizzes.');
                    window.location.href = 'profile.html?role=user';
                    return;
                }
                window.location.href = `payment.html?quizId=${quizId}`;
            }
        }
    });

    // Tailored recommendations by field
    async function fetchRecommendedByField() {
        try {
            const res = await fetch(`${backendUrl}/quizzes`, { headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
            const data = await res.json();
            const prefLocal = localStorage.getItem('fieldPreference');
            const pref = (user && user.profile && user.profile.fieldPreference) || prefLocal || 'General Knowledge';
            const map = {
                'Technical': data.categories?.technical || [],
                'Law': data.categories?.law || [],
                'Medical': data.categories?.medical || [],
                'General Knowledge': data.categories?.gk || [],
                'Social Studies': data.categories?.social || []
            };
            const base = map[pref] || [];
            const rec = pickTop(base.length > 0 ? base : ([...(data.categories?.technical||[]),...(data.categories?.gk||[])]), 12);
            renderIntoGrid(rec, 'recommended-quizzes-container');
        } catch (e) { fetchQuizzes(); }
    }

    // --- Initial Page Load ---
    fetchRecommendedByField();
    // Removed KPIs/Registered/History/Leaderboard/Badges from dashboard per spec

    // Note: The poller logic from the original file has been removed for clarity,
    // as it can cause performance issues and is better replaced by WebSockets.
    // You can add it back if needed.
});

// --- Function to show error messages in a better way ---
function showErrorMessage(message) {
    // Create a custom error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class='bx bxs-error-circle'></i>
            <span>${message}</span>
            <button class="error-close">&times;</button>
        </div>
    `;
    document.body.appendChild(errorDiv);

    // Style the error notification
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: 'Poppins', sans-serif;
        animation: slideIn 0.3s ease;
    `;

    const errorContent = errorDiv.querySelector('.error-content');
    errorContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    const closeBtn = errorDiv.querySelector('.error-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: auto;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);

    // Close on click
    closeBtn.addEventListener('click', () => {
        errorDiv.remove();
    });
}
