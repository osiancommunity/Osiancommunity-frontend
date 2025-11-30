document.addEventListener("DOMContentLoaded", function() {
    const backendUrl = 'http://localhost:5000/api';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Authentication Check
    if (!token || !user || user.role !== 'user') {
        alert('Access Denied. Please log in.');
        window.location.href = 'login.html';
        return;
    }

    // --- Load Sidebar ---
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        fetch('sidebar-user.html')
            .then(response => response.text())
            .then(data => {
                sidebarContainer.innerHTML = data;
                // Set the active link
                document.querySelector('a[href="profile.html"]').parentElement.classList.add('active');
                // Add logout functionality
                const logoutBtn = sidebarContainer.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        localStorage.clear();
                        window.location.href = 'login.html';
                    });
                }
            });
    }

    // --- Page Elements ---
    const profileForm = document.getElementById('profile-form');
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('email');
    const ageInput = document.getElementById('user-age');
    const instituteInput = document.getElementById('user-institute');
    const courseInput = document.getElementById('user-course');
    const yearInput = document.getElementById('user-year');
    const stateInput = document.getElementById('user-state');
    const cityInput = document.getElementById('user-city');
    const mobileInput = document.getElementById('user-mobile');

    const profileNameDisplay = document.getElementById('profile-name-display');
    const profileEmailDisplay = document.getElementById('profile-email-display');
    const profilePreview = document.getElementById('profile-preview');
    const headerProfileImg = document.getElementById('header-profile-img');
    const headerProfileName = document.getElementById('header-profile-name');
    const profileUploadInput = document.getElementById('profile-upload');
    
    // Tab elements
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // Variable to hold the new profile picture data
    let profileImageBase64 = null;

    // --- Load Profile Data ---
    async function loadProfile() {
        try {
            const response = await fetch(`${backendUrl}/users/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                let errorMessage = 'Failed to fetch profile data.';
                if (response.status === 401) {
                    errorMessage = 'Unauthorized access. Please log in again.';
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                } else if (response.status === 403) {
                    errorMessage = 'Access forbidden. You may not have permission to view this profile.';
                } else if (response.status === 404) {
                    errorMessage = 'Profile not found.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
                throw new Error(`${errorMessage} (Status: ${response.status})`);
            }

            const responseData = await response.json();
            const profileData = responseData.user; // Backend nests user data

            if (!profileData) throw new Error('User data not found in response.');

            // Ensure profile object exists to prevent errors
            profileData.profile = profileData.profile || {};

            // Populate form
            nameInput.value = profileData.name || '';
            emailInput.value = profileData.email || '';
            ageInput.value = profileData.profile.age || '';
            instituteInput.value = profileData.profile.college || '';
            courseInput.value = profileData.profile.course || '';
            yearInput.value = profileData.profile.year || '';
            stateInput.value = profileData.profile.state || '';
            cityInput.value = profileData.profile.city || '';
            mobileInput.value = profileData.profile.phone || '';

            // Populate display elements
            profileNameDisplay.textContent = profileData.name;
            profileEmailDisplay.textContent = profileData.email;
            headerProfileName.textContent = profileData.name;

            const avatarUrl = profileData.profile.avatar || 'https://placehold.co/120';
            profilePreview.src = avatarUrl;
            if (avatarUrl.startsWith('https://placehold.co/')) {
                headerProfileImg.src = avatarUrl.replace('120', '40');
            } else {
                headerProfileImg.src = avatarUrl;
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            alert(`Could not load your profile: ${error.message}`);
        } // No finally block needed here as it's just loading
    }

    // --- Handle Profile Picture Selection ---
    profileUploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check file size (e.g., limit to 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('File is too large. Please select an image under 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                profileImageBase64 = event.target.result; // This is the Base64 string
                profilePreview.src = profileImageBase64; // Show a live preview
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Handle Profile Update ---
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const saveButton = profileForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        const updatedData = {
            name: nameInput.value,
            profilePicture: profileImageBase64, // Add the image data to the request
            profile: {
                age: ageInput.value,
                college: instituteInput.value, // Backend expects 'college'
                course: courseInput.value,
                year: yearInput.value,
                state: stateInput.value,
                city: cityInput.value,
                phone: mobileInput.value
            }
        };

        try {
            const response = await fetch(`${backendUrl}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();
            if (!response.ok) { // Check for non-2xx status codes
                let errorMessage = result.message || 'Failed to update profile.';
                if (response.status === 401) {
                    errorMessage = 'Unauthorized. Please log in again.';
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(errorMessage);
            }

            // Update user in localStorage with the fresh data from the server
            const updatedUser = { ...JSON.parse(localStorage.getItem('user')), ...result.user };
            updatedUser.name = result.user.name; // Explicitly update name
            updatedUser.profile = result.user.profile; // Explicitly update profile object
            localStorage.setItem('user', JSON.stringify(updatedUser));

            alert('Profile updated successfully!');
            loadProfile(); // Refresh data on page
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    });

    // --- Handle Password Change Form Submission ---
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const passwordSaveButton = passwordForm.querySelector('button[type="submit"]');
            passwordSaveButton.disabled = true;
            passwordSaveButton.textContent = 'Updating...';

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;

            if (newPassword !== confirmNewPassword) {
                alert('New passwords do not match.');
                passwordSaveButton.disabled = false;
                passwordSaveButton.textContent = 'Update Password';
                return;
            }

            if (newPassword.length < 6) {
                alert('New password must be at least 6 characters long.');
                passwordSaveButton.disabled = false;
                passwordSaveButton.textContent = 'Update Password';
                return;
            }

            try {
                // Assuming the backend endpoint for changing password is /auth/change-password
                const response = await fetch(`${backendUrl}/auth/change-password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                });

                const result = await response.json();
                if (!response.ok) { // Check for non-2xx status codes
                    let errorMessage = result.message || 'Failed to change password.';
                    if (response.status === 401) { // Handle unauthorized specifically
                        errorMessage = 'Unauthorized. Please log in again.';
                        localStorage.clear();
                        window.location.href = 'login.html';
                    }
                    throw new Error(errorMessage);
                }

                alert('Password changed successfully!');
                passwordForm.reset();
            } catch (error) {
                console.error('Error changing password:', error);
                alert(`Failed to change password: ${error.message}`);
            } finally {
                passwordSaveButton.disabled = false;
                passwordSaveButton.textContent = 'Update Password';
            }
        });
    }

    // --- Tab Switching Logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate clicked tab and content
            tab.classList.add('active');
            const targetContent = document.getElementById(tab.dataset.tab);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // --- Initial Load ---
    loadProfile();
});
