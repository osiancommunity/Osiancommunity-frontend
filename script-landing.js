// JavaScript for mobile menu toggle
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
});

// Close menu when a link is clicked
document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
}));

// Toggle Login/Signup vs Logout based on session
const navLogin = document.getElementById('nav-login');
const navSignup = document.getElementById('nav-signup');
const navLogout = document.getElementById('nav-logout');

try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (token && user) {
        if (navLogin) navLogin.style.display = 'none';
        if (navSignup) navSignup.style.display = 'none';
        if (navLogout) navLogout.style.display = 'inline-block';
        if (navLogout) {
            navLogout.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                location.href = 'login.html';
            });
        }
    }
} catch (_) {}
