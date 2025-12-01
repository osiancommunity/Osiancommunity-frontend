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

// Auth-aware nav and redirect
document.addEventListener('DOMContentLoaded', function(){
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        const loginBtn = document.getElementById('nav-login');
        const signupBtn = document.getElementById('nav-signup');
        const logoutBtn = document.getElementById('nav-logout');
        const loginMobile = document.getElementById('nav-login-mobile');
        const signupMobile = document.getElementById('nav-signup-mobile');
        const logoutMobile = document.getElementById('nav-logout-mobile');

        const show = (el) => { if (el) el.style.display = ''; };
        const hide = (el) => { if (el) el.style.display = 'none'; };

        if (token && user) {
            hide(loginBtn); hide(signupBtn); show(logoutBtn);
            hide(loginMobile); hide(signupMobile); show(logoutMobile);
            const role = String((user && user.role) || '').toLowerCase();
            if (role === 'superadmin') {
                window.location.replace('dashboard-superadmin.html');
                return;
            } else if (role === 'admin') {
                window.location.replace('dashboard-admin.html');
                return;
            } else {
                window.location.replace('dashboard-user.html');
                return;
            }
        } else {
            show(loginBtn); show(signupBtn); hide(logoutBtn);
            show(loginMobile); show(signupMobile); hide(logoutMobile);
        }

        const doLogout = function(e){
            if (e) e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        };
        if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
        if (logoutMobile) {
            const a = logoutMobile.querySelector('a');
            if (a) a.addEventListener('click', doLogout);
        }
    } catch (_) {}
});
