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

        const show = (el) => { if (el) el.style.display = ''; };
        const hide = (el) => { if (el) el.style.display = 'none'; };

        if (token && user) {
            hide(loginBtn); hide(signupBtn); show(logoutBtn);
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

    // Active underline for navbar links by hash
    const setActive = () => {
        const hash = location.hash || '#home';
        document.querySelectorAll('.nav-link').forEach(a => {
            if (a.getAttribute('href') === hash) a.classList.add('active'); else a.classList.remove('active');
        });
    };
    setActive();
    window.addEventListener('hashchange', setActive);

    // Redirect category clicks to Sign Up
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function(){ window.location.href = 'register.html'; });
    });
});
