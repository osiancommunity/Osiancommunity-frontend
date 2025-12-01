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
            renderQuizzes(cat.technical, 'technical-quizzes-container', 'technical-section');
            renderQuizzes(cat.gk, 'gk-quizzes-container', 'gk-section');
            renderQuizzes(cat.engineering, 'engineering-quizzes-container', 'engineering-section');
            renderQuizzes(cat.sports, 'sports-quizzes-container', 'sports-section');
            renderQuizzes(cat.coding, 'coding-quizzes-container', 'coding-section');
            renderQuizzes(cat.law, 'law-quizzes-container', 'law-section');
            renderQuizzes(cat.studies, 'studies-quizzes-container', 'studies-section');

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
                <button class="quiz-btn ${isPaid ? 'paid' : 'live'}" data-quiz-id="${quiz._id}" onclick="window.location.href='${destinationUrl}'">${isPaid ? `Register (₹${quiz.price.toFixed(2)})` : 'Join Now'}</button>
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

    // --- Initial Page Load ---
    fetchQuizzes();

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
