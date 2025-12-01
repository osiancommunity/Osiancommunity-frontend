document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const formStatus = document.getElementById('form-status');
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const otpSection = document.getElementById('otp-section');
    const otpResetForm = document.getElementById('otp-reset-form');
    const otpInput = document.getElementById('otp');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    function apiBase() {
        const isProd = (location.hostname.endsWith('vercel.app') || location.hostname.endsWith('github.io') || location.hostname.includes('osiancommunity'));
        return isProd ? 'https://osiancommunity-backend.vercel.app' : 'http://localhost:5000';
    }

    sendOtpBtn.addEventListener('click', async () => {
        formStatus.textContent = 'Sending OTP...';
        formStatus.style.color = '#555';
        try {
            const response = await fetch(apiBase() + '/api/auth/forgot-password-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'An error occurred.');
            }
            formStatus.textContent = result.message;
            formStatus.style.color = 'green';
            otpSection.style.display = 'block';
        } catch (error) {
            formStatus.textContent = error.message;
            formStatus.style.color = 'red';
        }
    });

    otpResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!emailInput.value) {
            formStatus.textContent = 'Enter your email.';
            formStatus.style.color = 'red';
            return;
        }
        if (!otpInput.value || otpInput.value.length !== 6) {
            formStatus.textContent = 'Enter the 6-digit OTP.';
            formStatus.style.color = 'red';
            return;
        }
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            formStatus.textContent = 'Passwords do not match.';
            formStatus.style.color = 'red';
            return;
        }
        formStatus.textContent = 'Resetting...';
        formStatus.style.color = '#555';
        try {
            const response = await fetch(apiBase() + '/api/auth/reset-password-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, otp: otpInput.value, newPassword: newPasswordInput.value })
            });
            const result = await response.json();
            formStatus.textContent = result.message;
            if (response.ok) {
                formStatus.style.color = 'green';
            } else {
                formStatus.style.color = 'red';
            }
        } catch (error) {
            formStatus.textContent = 'An unexpected error occurred.';
            formStatus.style.color = 'red';
        }
    });
});
