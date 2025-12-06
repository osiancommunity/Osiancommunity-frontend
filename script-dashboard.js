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


    // --- Fetch and Display Quizzes ---
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
