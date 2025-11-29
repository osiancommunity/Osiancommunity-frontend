document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000/api';

    const settingsForm = document.getElementById('settings-form');
    const formStatus = document.getElementById('form-status');

    const avatarUpload = document.getElementById('avatar-upload');
    const changePicBtn = document.getElementById('change-pic-btn');

    // DOM elements for profile data
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const nameInput = document.getElementById('name');
    const profileAvatar = document.getElementById('profile-avatar');
    const headerAvatar = document.getElementById('header-avatar');
    const emailInput = document.getElementById('email');
    const mobileInput = document.getElementById('mobile');
    const cityInput = document.getElementById('city');
    const collegeInput = document.getElementById('college');
    const branchInput = document.getElementById('branch');
    const stateInput = document.getElementById('state');
    const organizationInput = document.getElementById('organization');
    const quizzesTaken = document.getElementById('quizzes-taken');
    const winRate = document.getElementById('win-rate');
    const totalPoints = document.getElementById('total-points');

    // Default data if nothing is in localStorage
    const defaultData = {
        name: 'please set your name',
        username: '@diljotsingh',
        email: '123@example.com',
        mobile: '',
        city: '',
        college: '',
        branch: '',
        state: '',
        organization: '',
        avatar: 'https://i.ibb.co/jP9JWBBy/diljj.png',
        stats: {
            quizzes: 25,
            winPercentage: 80,
            points: 12500
        }
    };

    // Function to load user data
    async function loadUserData(role) {
        const token = localStorage.getItem('token');
        if (!token || token === 'profile') {
            // If token is missing or corrupted, force logout and redirect to login.
            alert('Session expired or invalid token. Please login again.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                    return;
                }
                const errorText = await response.text();
                console.error('Failed response text:', errorText);
                throw new Error('Failed to fetch profile');
            }

            const data = await response.json();
            const user = data.user;
            let existingLocal = {};
            try { existingLocal = JSON.parse(localStorage.getItem('osianUserData')) || {}; } catch(e) { existingLocal = {}; }

            // Merge with default data
            let userData = {
                ...defaultData,
                _id: user._id,  // Add user unique _id
                name: user.name,
                email: user.email,
                username: user.username || defaultData.username,
                mobile: user.profile?.phone || '',
                city: user.profile?.city || '',
                college: user.profile?.college || '',
                branch: user.profile?.course || '',
                state: user.profile?.state || '',
                organization: user.profile?.organization || '',
                avatar: user.profile?.avatar || defaultData.avatar,
                stats: defaultData.stats // Keep default stats for now
            };

            

            localStorage.setItem('osianUserData', JSON.stringify(userData));

            // Show/hide fields based on role
            const userFields = document.getElementById('user-fields');
            const adminFields = document.getElementById('admin-fields');

            if (role === 'admin' || role === 'superadmin') {
                if(userFields) userFields.style.display = 'none';
                if(adminFields) adminFields.style.display = 'block';
            } else {
                if(userFields) userFields.style.display = 'block';
                if(adminFields) adminFields.style.display = 'none';
            }

            // Populate profile card and settings form
            if(profileName) profileName.textContent = userData.name;
            if(profileUsername) profileUsername.textContent = userData.username;
            if(nameInput) nameInput.value = userData.name;
            if(emailInput) emailInput.value = userData.email;

            if(mobileInput) mobileInput.value = userData.mobile || '';
            if(cityInput) cityInput.value = userData.city || '';

            if (role === 'user') {
                if(collegeInput) collegeInput.value = userData.college || '';
                if(branchInput) branchInput.value = userData.branch || '';
                if(stateInput) stateInput.value = userData.state || '';
            } else {
                if(organizationInput) organizationInput.value = userData.organization || '';
            }

            if (userData.avatar) {
                if(profileAvatar) profileAvatar.src = userData.avatar;
                if (headerAvatar) {
                    headerAvatar.src = userData.avatar;
                }
            }

            // Populate stats
            if(quizzesTaken) quizzesTaken.textContent = userData.stats.quizzes;
            if(winRate) winRate.textContent = `${userData.stats.winPercentage}%`;
            if(totalPoints) totalPoints.textContent = userData.stats.points.toLocaleString();

        } catch (error) {
            console.error('Error loading user data:', error);
            // Fallback to localStorage if backend fails
            const user = JSON.parse(localStorage.getItem('user')) || {};
            let userData = JSON.parse(localStorage.getItem('osianUserData')) || defaultData;

            userData = {
                ...defaultData,
                ...userData,
                name: user.name || userData.name,
                email: user.email || userData.email,
            };

            // Populate as before
            if(profileName) profileName.textContent = userData.name;
            if(profileUsername) profileUsername.textContent = userData.username;
            if(nameInput) nameInput.value = userData.name;
            if(emailInput) emailInput.value = userData.email;
            if(mobileInput) mobileInput.value = userData.mobile || '';
            if(cityInput) cityInput.value = userData.city || '';

            if (role === 'user') {
                if(collegeInput) collegeInput.value = userData.college || '';
                if(branchInput) branchInput.value = userData.branch || '';
                if(stateInput) stateInput.value = userData.state || '';
            } else {
                if(organizationInput) organizationInput.value = userData.organization || '';
            }

            if (userData.avatar) {
                if(profileAvatar) profileAvatar.src = userData.avatar;
                if (headerAvatar) {
                    headerAvatar.src = userData.avatar;
                }
            }

            if(quizzesTaken) quizzesTaken.textContent = userData.stats.quizzes;
            if(winRate) winRate.textContent = `${userData.stats.winPercentage}%`;
            if(totalPoints) totalPoints.textContent = userData.stats.points.toLocaleString();
        }
    }

    // Function to update sidebar links based on role
    function updateSidebarLinks(role) {
        const sidebarLogoLink = document.getElementById('sidebar-logo-link');
        const dashboardLink = document.getElementById('dashboard-link');
        const myQuizzesLink = document.getElementById('my-quizzes-link');
        const mentorshipLink = document.getElementById('mentorship-link');
        const notificationsLink = document.getElementById('notifications-link');
        const profileLink = document.getElementById('profile-link');

        // Hide all by default, then show role-specific ones
        const myQuizzesLi = document.getElementById('my-quizzes-link-li');
        const mentorshipLi = document.getElementById('mentorship-link-li');
        if (myQuizzesLi) myQuizzesLi.style.display = 'list-item';
        if (mentorshipLi) mentorshipLi.style.display = 'list-item';

        if (role === 'admin') {
            if (sidebarLogoLink) sidebarLogoLink.href = 'dashboard-admin.html';
            if (dashboardLink) dashboardLink.href = 'dashboard-admin.html';
            if (myQuizzesLink) myQuizzesLink.href = 'my-quizzes.html';
            if (mentorshipLink) mentorshipLink.parentElement.style.display = 'none';
            if (notificationsLink) notificationsLink.parentElement.style.display = 'none';
            if (profileLink) profileLink.href = `profile.html?role=admin`;
        } else if (role === 'superadmin') {
            if (sidebarLogoLink) sidebarLogoLink.href = 'dashboard-superadmin.html';
            if (dashboardLink) dashboardLink.href = 'dashboard-superadmin.html';
            if (myQuizzesLink) {
                myQuizzesLink.href = 'user-management.html';
                myQuizzesLink.querySelector('span').textContent = 'User Management';
            }
            if (mentorshipLink) mentorshipLink.href = 'mentorship.html';
            if (notificationsLink) notificationsLink.href = 'create-notification.html';
            if (profileLink) profileLink.href = `profile.html?role=superadmin`;
        } else { // 'user' role
            if (sidebarLogoLink) sidebarLogoLink.href = 'dashboard-user.html';
            if (dashboardLink) dashboardLink.href = 'dashboard-user.html';
            if (myQuizzesLink) myQuizzesLink.href = 'quiz-progress.html';
            if (mentorshipLink) mentorshipLink.href = 'mentorship-user.html';
            if (notificationsLink) notificationsLink.href = 'notifications.html';
            if (profileLink) profileLink.href = `profile.html?role=user`;
        }
    }

    // Function to save user data
    function saveUserData(data) {
        localStorage.setItem('osianUserData', JSON.stringify(data));
    }

    // Function to format mobile number
    function formatMobile(value) {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');
        // Format as (XXX) XXX-XXXX if 10 digits
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return value; // Return as is if not 10 digits
    }

    // Function to capitalize first letter
    function capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }

    // Event listener for form submission
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = getRoleFromURL();
        
        const updatedProfileData = {
            name: nameInput ? nameInput.value : '',
            profile: {
                phone: mobileInput ? mobileInput.value.replace(/\D/g, '') : '', // send only digits
                city: cityInput ? capitalize(cityInput.value) : ''
            }
        };
    
        if (role === 'user') {
            updatedProfileData.profile.college = collegeInput ? collegeInput.value : '';
            updatedProfileData.profile.course = branchInput ? branchInput.value : '';
            updatedProfileData.profile.state = stateInput ? capitalize(stateInput.value) : '';
        } else {
            updatedProfileData.profile.organization = organizationInput ? organizationInput.value : '';
        }

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedProfileData)
            });

            if (!response.ok) {
                throw new Error('Failed to save changes');
            }

            // On successful save, reload data from the backend to ensure UI is in sync
            await loadUserData(role); 

            formStatus.textContent = 'Changes saved successfully!';
            formStatus.style.color = 'green';

        } catch (error) {
            console.error('Error saving profile data:', error);
            formStatus.textContent = 'Failed to save changes. Please try again.';
            formStatus.style.color = 'red';
        } finally {
            setTimeout(() => formStatus.textContent = '', 3000);
        }
    });

    // Event listener for the new "Change Picture" button
    if(changePicBtn) changePicBtn.addEventListener('click', () => {
        if(avatarUpload) avatarUpload.click(); // Programmatically click the hidden file input
    });

    // Event listener for avatar upload
avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size before reading
        const maxSizeBytes = 1048576; // 1MB
        if (file.size > maxSizeBytes) {
            alert('File size exceeds 1MB limit. Please choose a smaller image.');
            e.target.value = ''; // Clear file input
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const avatarDataUrl = event.target.result;
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        profilePicture: avatarDataUrl
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update avatar');
                }

                // Update localStorage
                const currentData = JSON.parse(localStorage.getItem('osianUserData')) || defaultData;
                currentData.avatar = avatarDataUrl;
                saveUserData(currentData);

                loadUserData(getRoleFromURL()); // Reload to show the new avatar

            } catch (error) {
                console.error('Error updating avatar:', error);
                alert('Failed to update avatar. Please try again.');
            }
        };
        reader.readAsDataURL(file);
    });

    // Function to get role from URL
    function getRoleFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('role') || 'user'; // Default to 'user' if no role is specified
    }

    // Initial load of user data
    const userRole = getRoleFromURL();
    updateSidebarLinks(userRole);
    loadUserData(userRole);
});
