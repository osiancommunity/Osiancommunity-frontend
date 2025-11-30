document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend API
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

    const registerForm = document.getElementById("register-form");
    const registerBtn = document.getElementById("register-btn");
    const otpSection = document.getElementById("otp-section");
    const verifyOtpBtn = document.getElementById("verify-otp-btn");
    const resendOtpBtn = document.getElementById("resend-otp-btn");

    let currentUserId = null;

    // --- Handle Registration ---
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const fullName = document.getElementById("fullname").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long!");
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = "Registering...";

        try {
            // --- BACKEND CALL: /auth/register ---
            const response = await fetch(`${backendUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fullName,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle backend errors (e.g., email already in use)
                alert(`Registration failed: ${data.message}`);
            } else {
                // --- SUCCESS: Show OTP Section ---
                currentUserId = data.userId;
                registerForm.style.display = 'none';
                otpSection.style.display = 'block';
                document.getElementById('otp-input').focus();
            }

        } catch (error) {
            console.error('Registration Error:', error);
            alert('A network error occurred. Please ensure the backend server is running.');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = "Register";
        }
    });

    // --- Handle OTP Verification ---
    verifyOtpBtn.addEventListener('click', async function() {
        const otp = document.getElementById('otp-input').value;

        if (!otp || otp.length !== 6) {
            alert('Please enter a valid 6-digit OTP');
            return;
        }

        this.disabled = true;
        this.textContent = 'Verifying...';

        try {
            const response = await fetch(`${backendUrl}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById("email").value,
                    otp: otp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`OTP verification failed: ${data.message}`);
            } else {
                // --- SUCCESS: Save token and redirect ---
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                alert('Registration and verification successful! Redirecting to Dashboard.');
                window.location.href = "dashboard-user.html";
            }

        } catch (error) {
            console.error('OTP Verification Error:', error);
            alert('A network error occurred during verification.');
        } finally {
            this.disabled = false;
            this.textContent = 'Verify OTP';
        }
    });

    // --- Handle Resend OTP ---
    resendOtpBtn.addEventListener('click', async function() {
        if (!currentUserId) {
            alert('No user ID available. Please register again.');
            return;
        }

        this.disabled = true;
        this.textContent = 'Sending...';

        try {
            const response = await fetch(`${backendUrl}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Failed to resend OTP: ${data.message}`);
            } else {
                alert('OTP sent successfully! Check your email.');
                document.getElementById('otp-input').value = '';
                document.getElementById('otp-input').focus();
            }

        } catch (error) {
            console.error('Resend OTP Error:', error);
            alert('A network error occurred while resending OTP.');
        } finally {
            this.disabled = false;
            this.textContent = 'Resend OTP';
        }
    });
});
