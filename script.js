document.addEventListener("DOMContentLoaded", function() {

    // --- SETUP ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

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
                const response = await fetch(`${backendUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    // If response is not 200-299, it's an error (e.g., 401, 404)
                    // For 500 errors, the response might not be JSON.
                    if (response.status >= 500) {
                        throw new Error('Server error. Please try again later.');
                    }
                    // For other errors (400, 401, 404), we expect a JSON message.
                    if (data && data.message) {
                        throw new Error(data.message);
                    } else {
                        throw new Error('Invalid email or password');
                    }
                }

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
