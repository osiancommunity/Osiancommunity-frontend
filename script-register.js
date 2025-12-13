document.addEventListener("DOMContentLoaded", function() {

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
            const data = await apiFetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fullName,
                    email: email,
                    password: password
                })
            });
            currentUserId = data.userId;
            registerForm.style.display = 'none';
            otpSection.style.display = 'block';
            document.getElementById('otp-input').focus();

        } catch (error) {
            console.error('Registration Error:', error);
            alert(error && error.message ? error.message : 'Unable to connect to the server. Please try again later.');
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
            const data = await apiFetch('/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById("email").value,
                    otp: otp
                })
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Registration and verification successful! Redirecting to Dashboard.');
            window.location.href = "dashboard-user.html";

        } catch (error) {
            console.error('OTP Verification Error:', error);
            alert(error && error.message ? error.message : 'Unable to connect to the server. Please try again later.');
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
            const data = await apiFetch('/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId
                })
            });
            alert('OTP sent successfully! Check your email.');
            document.getElementById('otp-input').value = '';
            document.getElementById('otp-input').focus();

        } catch (error) {
            console.error('Resend OTP Error:', error);
            alert(error && error.message ? error.message : 'Unable to connect to the server. Please try again later.');
        } finally {
            this.disabled = false;
            this.textContent = 'Resend OTP';
        }
    });
});
