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
    const navLoginMobile = document.getElementById('nav-login-mobile');
    const navSignupMobile = document.getElementById('nav-signup-mobile');
    const navLogoutMobile = document.getElementById('nav-logout-mobile');
    const showLoggedOut = () => {
        if (navLogin) navLogin.style.display = 'inline-block';
        if (navSignup) navSignup.style.display = 'inline-block';
        if (navLogout) navLogout.style.display = 'none';
        if (navLoginMobile) navLoginMobile.style.display = '';
        if (navSignupMobile) navSignupMobile.style.display = '';
        if (navLogoutMobile) navLogoutMobile.style.display = 'none';
    };
    const showLoggedIn = () => {
        if (navLogin) navLogin.style.display = 'none';
        if (navSignup) navSignup.style.display = 'none';
        if (navLogout) navLogout.style.display = 'inline-block';
        if (navLoginMobile) navLoginMobile.style.display = 'none';
        if (navSignupMobile) navSignupMobile.style.display = 'none';
        if (navLogoutMobile) navLogoutMobile.style.display = '';
    };
    const doLogout = (e) => {
        if (e) e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        location.href = 'index.html';
    };
    if (token && user) {
        showLoggedIn();
        if (navLogout) navLogout.addEventListener('click', doLogout);
        if (navLogoutMobile) navLogoutMobile.addEventListener('click', doLogout);
    } else {
        showLoggedOut();
    }
} catch (_) {}
