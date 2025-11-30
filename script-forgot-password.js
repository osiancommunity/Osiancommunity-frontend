document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = (location.hostname.endsWith('vercel.app'))
        ? 'https://osiancommunity-backend.vercel.app/api'
        : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:5000/api'
            : 'https://osiancommunity-backend.vercel.app/api');

    const emailForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const otpForm = document.getElementById('reset-with-otp-form');
    const otpInput = document.getElementById('otp');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const formStatus = document.getElementById('form-status');

    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formStatus.textContent = 'Sending OTP...';
        formStatus.style.color = '#555';
        try {
            let response = await fetch(`${backendUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value })
            });
            if (response.status === 404) {
                response = await fetch(`${backendUrl}/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput.value })
                });
            }
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'An error occurred.');
            }
            formStatus.textContent = 'OTP sent to your email. Enter it below to reset your password.';
            formStatus.style.color = 'green';
            otpForm.style.display = 'block';
        } catch (error) {
            formStatus.textContent = error.message;
            formStatus.style.color = 'red';
        }
    });

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            formStatus.textContent = 'Passwords do not match.';
            formStatus.style.color = 'red';
            return;
        }
        formStatus.textContent = 'Resetting password...';
        formStatus.style.color = '#555';
        try {
            let response = await fetch(`${backendUrl}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailInput.value,
                    otp: otpInput.value,
                    newPassword: newPasswordInput.value
                })
            });
            if (response.status === 404) {
                response = await fetch(`${backendUrl}/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: emailInput.value,
                        otp: otpInput.value,
                        newPassword: newPasswordInput.value
                    })
                });
            }
            const result = await response.json();
            formStatus.textContent = result.message || 'Done';
            if (response.ok) {
                formStatus.style.color = 'green';
            } else {
                formStatus.style.color = 'red';
            }
        } catch (error) {
            formStatus.textContent = error.message || 'Unexpected error';
            formStatus.style.color = 'red';
        }
    });
});
