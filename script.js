document.addEventListener("DOMContentLoaded", function() {

    // --- SETUP ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    
// Use centralized API helper with automatic fallback

    // --- 1. Check if already logged in ---
    // If a user visits login.html but is already logged in, send them to their dashboard.
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (token && user) {
        if (user.role === 'superadmin') {
            window.location.href = 'dashboard-superadmin.html';
        } else if (user.role === 'admin') {
            window.location.href = 'dashboard-admin.html';
        } else {
            window.location.href = 'dashboard-user.html';
        }
        return; // Stop the rest of the script from running
    }

    // --- 2. Handle Login Form Submission ---
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Prevent default form submission

            const email = emailInput.value;
            const password = passwordInput.value;

            // Clear previous errors
            if (errorMessage) {
                errorMessage.textContent = '';
                errorMessage.style.display = 'none';
            }
            
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';

            try {
                const data = await apiFetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                if (!data) throw new Error('Unable to reach server. Please try again.');

                // --- THIS IS THE CRITICAL FIX ---
                // Check that the API returned BOTH token and user
                if (data.token && data.user) {

                    // 1. Save the token string
                    localStorage.setItem('token', data.token);

                    // 2. Save the user object (as a string)
                    localStorage.setItem('user', JSON.stringify(data.user));
            
                    // 3. Redirect to the correct dashboard based on role
                    if (data.user.role === 'superadmin') {
                        window.location.href = 'dashboard-superadmin.html';
                    } else if (data.user.role === 'admin') {
                        window.location.href = 'dashboard-admin.html';
                    } else {
                        window.location.href = 'dashboard-user.html';
                    }

                } else {
                    // This handles if the server is misconfigured
                    throw new Error('Login failed: Invalid response from server.');
                }

            } catch (error) {
                // Show error message to the user
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = 'block';
                }
                console.error('Login error:', error);
                
                // Re-enable the button
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        });
    }
});
