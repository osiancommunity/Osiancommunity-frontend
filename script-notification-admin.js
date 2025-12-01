document.addEventListener("DOMContentLoaded", function() {
    function showToast(message, type){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast ' + (type || '');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
    }

    const backendUrl = (location.hostname.endsWith('vercel.app'))
        ? 'https://osiancommunity-backend.vercel.app/api'
        : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:5000/api'
            : 'https://osiancommunity-backend.vercel.app/api');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!token || !user || user.role.toLowerCase() !== 'superadmin') {
        showToast('Access Denied.', 'warning');
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
            showToast('Notification sent successfully!', 'success');
            form.reset();

        } catch (error) {
            console.error('Error sending notification:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class='bx bx-send'></i> Send Notification Now`;
        }
    });
});
