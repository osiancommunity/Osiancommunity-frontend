document.addEventListener("DOMContentLoaded", function() {
    
    const isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const backendUrl = isLocal ? 'http://localhost:5000/api' : 'https://osiancommunity-backend.vercel.app/api';

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
    // Find all logout buttons (in sidebar and sidebar-footer)
    const logoutButtons = document.querySelectorAll('.logout-btn');
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
                    'Authorization': `Bearer ${token}`
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
                showErrorMessage(`Error fetching quizzes: ${data.message}`);
                return;
            }

            // NEW: Populate category-based sections
            renderQuizzes(data.categories.technical, 'technical-quizzes-container', 'technical-section');
            renderQuizzes(data.categories.gk, 'gk-quizzes-container', 'gk-section');
            renderQuizzes(data.categories.engineering, 'engineering-quizzes-container', 'engineering-section');

        } catch (error) {
            console.error('Error fetching quizzes:', error);
            alert('Could not load quizzes. Server may be down.');
        }
    }
    
    // --- NEW: Function to render quizzes into a container ---
    function renderQuizzes(quizzes, containerId, sectionId) {
        const container = document.getElementById(containerId);
        const section = document.getElementById(sectionId);
        if (!container || !section) return;

        container.innerHTML = ''; // Clear loading message

        if (!quizzes || quizzes.length === 0) {
            // Hide the entire section if there are no quizzes for that category
            section.style.display = 'none';
            return;
        }

        // No duplication needed for square grid

        quizzes.forEach(quiz => {
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
                <img src="${quiz.coverImage || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'200\'><rect width=\'320\' height=\'200\' fill=\'%23dddddd\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'20\' fill=\'%23666\'>No Image</text></svg>'}" alt="${quiz.title}" class="quiz-card-img">
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
