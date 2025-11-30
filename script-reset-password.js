document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const formStatus = document.getElementById('form-status');
    const loginLink = document.getElementById('login-link');

    // Get the token from the URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        formStatus.textContent = 'Invalid or missing reset token.';
        formStatus.style.color = 'red';
        form.style.display = 'none';
        return;
    }

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
            const response = await fetch(((location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '') + '/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: passwordInput.value })
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
