document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const formStatus = document.getElementById('form-status');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        formStatus.textContent = 'Sending...';
        formStatus.style.color = '#555';

        try {
            const response = await fetch(((location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '') + '/api/forgot-password', {
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
