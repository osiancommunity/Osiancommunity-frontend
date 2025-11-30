document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = (location.hostname.endsWith('vercel.app'))
        ? 'https://osiancommunity-backend.vercel.app/api'
        : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:5000/api'
            : 'https://osiancommunity-backend.vercel.app/api');

    const form = document.getElementById('reset-password-form');
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const formStatus = document.getElementById('form-status');
    const loginLink = document.getElementById('login-link');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        formStatus.textContent = 'Resetting...';
        formStatus.style.color = '#555';

        if (passwordInput.value !== confirmPasswordInput.value) {
            formStatus.textContent = 'Passwords do not match.';
            formStatus.style.color = 'red';
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, otp: otpInput.value, newPassword: passwordInput.value })
            });

            const result = await response.json();
            formStatus.textContent = result.message;

            if (response.ok) {
                formStatus.style.color = 'green';
                form.style.display = 'none';
                loginLink.style.display = 'block';
            } else {
                formStatus.style.color = 'red';
            }
        } catch (error) {
            formStatus.textContent = 'An unexpected error occurred.';
            formStatus.style.color = 'red';
        }
    });
});
