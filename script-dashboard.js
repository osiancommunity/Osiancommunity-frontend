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
        // If no token, redirect to login page
        window.location.href = 'login.html';
        return; // Stop the script
    }
    // Display user's name in the header
    const welcomeHeader = document.querySelector('.header-title h1');
    if (welcomeHeader) {
        welcomeHeader.textContent = `Welcome Back, ${user.name}!`;
    }
    // Load user avatar from profile data
    const userData = JSON.parse(localStorage.getItem('osianUserData')) || {};
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar && userData.avatar) {
        headerAvatar.src = userData.avatar;
    }
    
    // Handle Logout
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    });

    const headerLogout = document.getElementById('header-logout');
    if (headerLogout) {
        headerLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    try {
        const cachedRegs = JSON.parse(localStorage.getItem('osianRegisteredQuizzes')) || [];
        const now = Date.now();
        cachedRegs.forEach(function(q){
            if (!q || q.quizType !== 'paid' || !q.scheduleTime) return;
            const startTs = new Date(q.scheduleTime).getTime();
            if (!startTs || isNaN(startTs)) return;
            const notifyAt = startTs - 3600000;
            const key = `quizReminder_${q._id}_${startTs}`;
            if (now >= notifyAt && now < startTs && !localStorage.getItem(key)) {
                showToast(`Reminder: "${q.title}" starts at ${new Date(startTs).toLocaleString()}`, 'info');
                try { localStorage.setItem(key, '1'); } catch (_) {}
            }
        });
    } catch (_) {}


    // --- Fetch and Display Quizzes ---
    let allQuizzesFlat = [];
    const categoryPillsRow = document.getElementById('category-pills');
    const fieldPillsRow = document.getElementById('field-pills');
    const levelPillsRow = document.getElementById('level-pills');
    let selectedCategory = '';
    let selectedField = '';
    let selectedLevel = '';

    const fieldOptionsByCategory = {
        technical: ['python','java','c++','os','networks','web'],
        law: ['constitutional','criminal','civil','corporate','tax'],
        engineering: ['mechanical','electrical','civil','computer'],
        gk: ['history','science','geography','current-affairs'],
        sports: ['football','cricket','basketball','athletics'],
        coding: ['javascript','python','java','c++','algorithms','data-structures'],
        studies: ['sociology','economics','politics','history']
    };

    const categoryIcons = {
        technical: 'bx bx-code-alt',
        law: 'bx bx-book-alt',
        engineering: 'bx bx-buildings',
        gk: 'bx bx-brain',
        sports: 'bx bx-football',
        coding: 'bx bx-code',
        studies: 'bx bx-library'
    };

    function renderCategoryPills(){
        if (!categoryPillsRow) return;
        const cats = ['technical','law','engineering','gk','sports','coding','studies'];
        categoryPillsRow.innerHTML = '';
        cats.forEach(function(cat){
            const el = document.createElement('button');
            el.className = 'category-card' + (selectedCategory === cat ? ' active' : '');
            el.type = 'button';
            const label = (cat.charAt(0).toUpperCase() + cat.slice(1)).replace('Gk','General Knowledge');
            const icon = categoryIcons[cat] || 'bx bx-category';
            el.innerHTML = `<i class='${icon}'></i><div class="category-info"><span class="category-name">${label}</span></div>`;
            el.dataset.cat = cat;
            el.onclick = function(){
                selectedCategory = cat;
                selectedField = '';
                selectedLevel = '';
                renderCategoryPills();
                renderFieldPills();
                levelPillsRow.innerHTML = '';
                document.getElementById('filtered-section').style.display = 'none';
            };
            categoryPillsRow.appendChild(el);
        });
    }

    function renderFieldPills(){
        if (!fieldPillsRow) return;
        fieldPillsRow.innerHTML = '';
        const opts = fieldOptionsByCategory[selectedCategory] || [];
        const counts = {};
        allQuizzesFlat.filter(function(q){ return String(q.category||'') === selectedCategory && String(q.visibility || 'public').toLowerCase() !== 'unlisted'; }).forEach(function(q){
            const key = String(q.field||'');
            counts[key] = (counts[key]||0) + 1;
        });
        opts.forEach(function(f){
            const el = document.createElement('button');
            el.className = 'field-chip' + (selectedField === f ? ' active' : '');
            el.type = 'button';
            el.textContent = f.charAt(0).toUpperCase() + f.slice(1);
            el.dataset.field = f;
            const c = counts[f]||0;
            if (c > 0) {
                const b = document.createElement('span');
                b.className = 'pill-badge';
                b.textContent = c;
                el.appendChild(b);
            }
            el.onclick = function(){
                selectedField = f;
                selectedLevel = '';
                renderFieldPills();
                renderLevelPills();
                document.getElementById('filtered-section').style.display = 'none';
            };
            fieldPillsRow.appendChild(el);
        });
    }

    function renderLevelPills(){
        if (!levelPillsRow) return;
        levelPillsRow.innerHTML = '';
        ['basic','medium','hard'].forEach(function(l){
            const el = document.createElement('button');
            el.className = 'level-pill ' + l + (selectedLevel === l ? ' active' : '');
            el.type = 'button';
            el.textContent = l.charAt(0).toUpperCase() + l.slice(1);
            el.dataset.level = l;
            el.onclick = function(){
                selectedLevel = l;
                renderLevelPills();
                applyFilter();
            };
            levelPillsRow.appendChild(el);
        });
    }

    async function fetchQuizzes() {
        try {
            const response = await fetch(`${backendUrl}/quizzes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return; // Silently redirect
                }
                showErrorMessage(`Error fetching quizzes: ${data.message}`);
                return;
            }

            // Featured Paid
            if (data.featured && Array.isArray(data.featured.paid)) {
                renderQuizzes(data.featured.paid, 'paid-quizzes-container', 'paid-section');
            }

            // Populate category-based sections (include all known categories)
            const cat = data.categories || {};

            allQuizzesFlat = [];
            Object.keys(cat).forEach(function(k){
                (cat[k]||[]).forEach(function(q){ allQuizzesFlat.push(q); });
            });

        } catch (error) {
            console.error('Error fetching quizzes:', error);
            showToast('Could not load quizzes. Server may be down.', 'error');
        }
    }
    
    // --- NEW: Function to render quizzes into a container ---
    function renderQuizzes(quizzes, containerId, sectionId) {
        const container = document.getElementById(containerId);
        const section = document.getElementById(sectionId);
        if (!container || !section) return;

        container.innerHTML = ''; // Clear loading message

        // Exclude unlisted quizzes from general discovery
        const visibleQuizzes = (quizzes || []).filter(q => String(q.visibility || 'public').toLowerCase() !== 'unlisted');

        if (!visibleQuizzes || visibleQuizzes.length === 0) {
            // Hide the entire section if there are no quizzes for that category
            section.style.display = 'none';
            return;
        }

        // No duplication needed for square grid

        visibleQuizzes.forEach(quiz => {
            container.innerHTML += createQuizCard(quiz);
        });
    }

    // --- NEW: Helper function to create a single quiz card with an image ---
    function createQuizCard(quiz) {
        const isPaid = quiz.quizType === 'paid';
        // The link depends on whether the quiz is paid or free
        const destinationUrl = isPaid ? `payment.html?quizId=${quiz._id}` : `quiz.html?id=${quiz._id}`;
        const participantsCount = (typeof quiz.registeredUsers === 'number')
            ? quiz.registeredUsers
            : (Array.isArray(quiz.participants) ? quiz.participants.length : 0);
        const priceStr = isPaid ? ((quiz.price != null && !Number.isNaN(Number(quiz.price))) ? Number(quiz.price).toFixed(2) : '0.00') : null;

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
                    <span><i class='bx bx-user'></i> ${participantsCount} Participants</span>
                    <span><i class='bx bx-time'></i> ${quiz.duration || 30} Mins</span>
                    ${quiz.field ? `<span><i class='bx bx-category'></i> ${quiz.field}</span>` : ''}
                    ${quiz.difficulty ? `<span><i class='bx bx-signal-4'></i> ${quiz.difficulty}</span>` : ''}
                </div>
                <button class="quiz-btn ${isPaid ? 'paid' : 'live'}" data-quiz-id="${quiz._id}" onclick="window.location.href='${destinationUrl}'">${isPaid ? `Register (₹${priceStr})` : 'Join Now'}</button>
            </div>
        `;
    }

    // --- Handle Quiz Registration Buttons ---
    async function getProfileCompleteness() {
        if (localStorage.getItem('profileComplete') === '1') {
            return 100;
        }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${backendUrl}/users/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('profile fetch failed');
            const data = await res.json();
            const u = data.user || {};
            const p = u.profile || {};
            const pctServer = Number((p && p.completionPercentage) ?? u.profileCompletion);
            if (!Number.isNaN(pctServer) && pctServer > 0) {
                const pctVal = Math.round(pctServer);
                if (pctVal >= 100) localStorage.setItem('profileComplete', '1');
                return pctVal;
            }
            const required = [u.name, u.email, p.phone, p.city, p.state];
            const filled = required.filter(v => v && String(v).trim().length > 0).length;
            const pctVal = Math.round((filled / required.length) * 100);
            if (pctVal >= 100) localStorage.setItem('profileComplete', '1');
            return pctVal;
        } catch (_) {
            // Fallback to locally cached profile to avoid false negatives
            try {
                const cached = JSON.parse(localStorage.getItem('osianUserData')) || {};
                const required = [cached.name, cached.email, cached.mobile, cached.city, cached.state];
                const filled = required.filter(v => v && String(v).trim().length > 0).length;
                const pctVal = Math.round((filled / required.length) * 100);
                if (pctVal >= 100) localStorage.setItem('profileComplete', '1');
                return pctVal;
            } catch (e) {
                return 0;
            }
        }
    }

    document.addEventListener('click', async function(e) {
        const paidBtn = e.target.closest('.quiz-btn.paid');
        if (paidBtn) {
            e.preventDefault();
            const quizId = paidBtn.getAttribute('data-quiz-id');
            if (quizId) {
                const pct = await getProfileCompleteness();
                if (pct < 100) {
                    showToast('Please complete your profile 100% before purchasing paid quizzes.', 'warning');
                    window.location.href = 'profile.html?role=user';
                    return;
                }
                window.location.href = `payment.html?quizId=${quizId}`;
            }
        }
    });

    function applyFilter(){
        const cat = selectedCategory;
        const fld = selectedField;
        const lvl = selectedLevel;
        const filtered = allQuizzesFlat.filter(function(q){
            return String(q.category||'') === cat && String(q.field||'') === fld && String(q.difficulty||'') === lvl && String(q.visibility || 'public').toLowerCase() !== 'unlisted';
        });
        const cont = document.getElementById('filtered-quizzes-container');
        const section = document.getElementById('filtered-section');
        if (cont && section) {
            cont.innerHTML = '';
            if (filtered.length === 0) {
                cont.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-illustration">🎯</div>
                        <h3>No quizzes match. Try selecting different filters.</h3>
                        <p>Or explore all visible quizzes.</p>
                        <button class="btn-primary" id="empty-explore-btn">Explore All Quizzes</button>
                    </div>
                `;
            } else {
                filtered.forEach(function(q){ cont.innerHTML += createQuizCard(q); });
            }
            section.style.display = 'block';
        }
    }

    renderCategoryPills();

    fetchQuizzes();

    // Profile dropdown interactions
    const profileBtn = document.getElementById('profile-menu-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const dropdownLogout = document.getElementById('dropdown-logout');
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', function(e){
            e.preventDefault();
            profileDropdown.classList.toggle('open');
        });
        document.addEventListener('click', function(e){
            if (!e.target.closest('.profile-menu')) {
                profileDropdown.classList.remove('open');
            }
        });
    }
    if (dropdownLogout) {
        dropdownLogout.addEventListener('click', function(e){
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    document.addEventListener('click', function(e){
        const btn = e.target.closest('#empty-explore-btn');
        if (btn) {
            const cont = document.getElementById('filtered-quizzes-container');
            if (cont) {
                cont.innerHTML = '';
                const visible = allQuizzesFlat.filter(function(q){ return String(q.visibility || 'public').toLowerCase() !== 'unlisted'; });
                visible.forEach(function(q){ cont.innerHTML += createQuizCard(q); });
            }
        }
    });

    // Update profile completeness in hero/KPI
    (async function(){
        try{
            const pct = await getProfileCompleteness();
            const label = document.getElementById('profile-progress-label');
            const fill = document.getElementById('profile-progress-fill');
            const stat = document.getElementById('stat-profile');
            if (label) label.textContent = `Profile ${pct}%`;
            if (fill) fill.style.width = pct + '%';
            if (stat) stat.textContent = pct + '%';
        } catch(_){ }
    })();

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
