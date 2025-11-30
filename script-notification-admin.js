document.addEventListener("DOMContentLoaded", function() {

    const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!token || !user || user.role.toLowerCase() !== 'superadmin') {
        alert('Access Denied.');
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('notification-form');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const recipient = document.getElementById('recipient').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;

        submitButton.disabled = true;
        submitButton.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Sending...`;

        try {
            const response = await fetch(`${backendUrl}/notifications/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipient,
                    subject,
                    message
                })
            });

            if (!response.ok) {
                // If the response is not OK, try to parse it as JSON for an error message.
                // If that fails, it's likely an HTML error page, so we use the status text.
                let result;
                try {
                    result = await response.json();
                } catch (e) {
                    throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
                }
                throw new Error(result.message || 'Failed to send notification.');
            }

            const result = await response.json();
            alert('Notification sent successfully!');
            form.reset();

        } catch (error) {
            console.error('Error sending notification:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class='bx bx-send'></i> Send Notification Now`;
        }
    });
});
