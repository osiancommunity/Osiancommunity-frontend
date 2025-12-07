document.addEventListener("DOMContentLoaded", function() {

    // --- SETUP ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    
const backendPrimary = (location.hostname.endsWith('vercel.app'))
  ? 'https://osiancommunity-backend.vercel.app/api'
  : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://osiancommunity-backend.vercel.app/api');
const backendFallback = 'https://osiancommunity-backend.vercel.app/api';

async function loginWithFallback(email, password) {
  const endpoints = backendPrimary === backendFallback
    ? [backendPrimary]
    : [backendPrimary, backendFallback];

  for (let i = 0; i < endpoints.length; i++) {
    const base = endpoints[i];
    try {
      const response = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        // If local returns 404 or network issues, try next endpoint
        if (response.status === 404 && i < endpoints.length - 1) continue;
        const dataErr = await response.json().catch(() => ({}));
        throw new Error(dataErr.message || 'Invalid email or password');
      }
      // Success
      const data = await response.json();
      return data;
    } catch (e) {
      if (i === endpoints.length - 1) throw e;
      // Try the next endpoint (likely cloud)
      continue;
    }
  }
}

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
                const data = await loginWithFallback(email, password);

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
                    const msg = (error && error.message && !String(error.message).includes('Failed to fetch'))
                      ? error.message
                      : 'Unable to connect to the server. Please try again later.';
                    errorMessage.textContent = msg;
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
