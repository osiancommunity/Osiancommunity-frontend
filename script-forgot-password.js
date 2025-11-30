document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const formStatus = document.getElementById('form-status');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        formStatus.textContent = 'Sending...';
        formStatus.style.color = '#555';

        try {
            const base = (location.hostname.endsWith('vercel.app') ? 'https://osiancommunity-backend.vercel.app' : 'http://localhost:5000');
            const response = await fetch(base + '/api/auth/forgot-password', {
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
        } catch (error) {
            formStatus.textContent = error.message;
            formStatus.style.color = 'red';
        }
    });
});
