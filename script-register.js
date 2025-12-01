document.addEventListener("DOMContentLoaded", function() {

const backendUrl = (location.hostname.endsWith('vercel.app'))
    ? 'https://osiancommunity-backend.vercel.app/api'
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://osiancommunity-backend.vercel.app/api');

function showToast(message, type){
    let el = document.getElementById('osian-toast');
    if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
    el.className = 'osian-toast ' + (type || '');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
}

    const registerForm = document.getElementById("register-form");
    const registerBtn = document.getElementById("register-btn");
    const otpSection = document.getElementById("otp-section");
    const verifyOtpBtn = document.getElementById("verify-otp-btn");
    const resendOtpBtn = document.getElementById("resend-otp-btn");

    let currentUserId = null;

    // --- Handle Registration ---
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const fullName = document.getElementById("fullname").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (password !== confirmPassword) {
            showToast("Passwords do not match!", 'warning');
            return;
        }

        if (password.length < 6) {
            showToast("Password must be at least 6 characters long!", 'warning');
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = "Registering...";

        try {
            // --- BACKEND CALL: /auth/register ---
            const response = await fetch(`${backendUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fullName,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle backend errors (e.g., email already in use)
                showToast(`Registration failed: ${data.message}`, 'error');
            } else {
                // --- SUCCESS: Show OTP Section ---
                currentUserId = data.userId;
                registerForm.style.display = 'none';
                otpSection.style.display = 'block';
                document.getElementById('otp-input').focus();
            }

        } catch (error) {
            console.error('Registration Error:', error);
            showToast('A network error occurred. Please ensure the backend server is running.', 'error');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = "Register";
        }
    });

    // --- Handle OTP Verification ---
    verifyOtpBtn.addEventListener('click', async function() {
        const otp = document.getElementById('otp-input').value;

        if (!otp || otp.length !== 6) {
            showToast('Please enter a valid 6-digit OTP', 'warning');
            return;
        }

        this.disabled = true;
        this.textContent = 'Verifying...';

        try {
            const response = await fetch(`${backendUrl}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById("email").value,
                    otp: otp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(`OTP verification failed: ${data.message}`, 'error');
            } else {
                // --- SUCCESS: Save token and redirect based on role ---
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                const role = String((data.user && data.user.role) || 'user').toLowerCase();
                showToast('Registration and verification successful! Redirecting to Dashboard.', 'success');
                if (role === 'superadmin') {
                    window.location.href = 'dashboard-superadmin.html';
                } else if (role === 'admin') {
                    window.location.href = 'dashboard-admin.html';
                } else {
                    window.location.href = 'dashboard-user.html';
                }
            }

        } catch (error) {
            console.error('OTP Verification Error:', error);
            showToast('A network error occurred during verification.', 'error');
        } finally {
            this.disabled = false;
            this.textContent = 'Verify OTP';
        }
    });

    // --- Handle Resend OTP ---
    resendOtpBtn.addEventListener('click', async function() {
        if (!currentUserId) {
            showToast('No user ID available. Please register again.', 'error');
            return;
        }

        this.disabled = true;
        this.textContent = 'Sending...';

        try {
            const response = await fetch(`${backendUrl}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(`Failed to resend OTP: ${data.message}`, 'error');
            } else {
                showToast('OTP sent successfully! Check your email.', 'success');
                document.getElementById('otp-input').value = '';
                document.getElementById('otp-input').focus();
            }

        } catch (error) {
            console.error('Resend OTP Error:', error);
            showToast('A network error occurred while resending OTP.', 'error');
        } finally {
            this.disabled = false;
            this.textContent = 'Resend OTP';
        }
    });
});
