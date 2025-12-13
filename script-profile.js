document.addEventListener('DOMContentLoaded', () => {
    function showToast(message, type){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast ' + (type || '');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
    }
    const backendUrl = window.API_BASE;

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
    const progressBar = document.getElementById('profile-progress-bar');
    const progressPercentEl = document.getElementById('profile-progress-percent');
    const profileMissingEl = document.getElementById('profile-missing');

    function setFieldHint(inputEl, message) {
        if (!inputEl) return;
        var next = inputEl.nextElementSibling;
        var hint = null;
        if (next && next.classList && next.classList.contains('field-hint')) hint = next;
        if (message) {
            inputEl.classList.add('input-missing');
            if (!hint) {
                hint = document.createElement('small');
                hint.className = 'field-hint';
                inputEl.parentNode.insertBefore(hint, inputEl.nextSibling);
            }
            hint.textContent = message;
        } else {
            inputEl.classList.remove('input-missing');
            if (hint) hint.remove();
        }
    }

    function getDataFromForm(role){
        return {
            name: nameInput ? nameInput.value : '',
            mobile: mobileInput ? mobileInput.value : '',
            city: cityInput ? cityInput.value : '',
            college: role === 'user' && collegeInput ? collegeInput.value : '',
            branch: role === 'user' && branchInput ? branchInput.value : '',
            state: role === 'user' && stateInput ? stateInput.value : '',
            organization: role !== 'user' && organizationInput ? organizationInput.value : ''
        };
    }

    function updateCompletionUI(userData, role){
        var c = computeCompletion(userData, role);
        if (progressBar) progressBar.style.width = c.percent + '%';
        if (progressPercentEl) progressPercentEl.textContent = c.percent + '%';
        if (profileMissingEl) profileMissingEl.textContent = c.missing.length ? ('Missing: ' + c.missing.join(', ')) : '';
        localStorage.setItem('profileCompletion', JSON.stringify(c));
        localStorage.setItem('profileComplete', c.percent === 100 ? 'true' : 'false');
        setFieldHint(nameInput, c.missing.includes('name') ? 'Required' : '');
        setFieldHint(mobileInput, c.missing.includes('phone') ? 'Enter 10+ digits' : '');
        setFieldHint(cityInput, c.missing.includes('city') ? 'Required' : '');
        if (role === 'user') {
            setFieldHint(collegeInput, c.missing.includes('college') ? 'Required' : '');
            setFieldHint(branchInput, c.missing.includes('branch') ? 'Required' : '');
            setFieldHint(stateInput, c.missing.includes('state') ? 'Required' : '');
        } else {
            setFieldHint(organizationInput, c.missing.includes('organization') ? 'Required' : '');
        }
    }

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
            showToast('Session expired or invalid token. Please login again.', 'warning');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        try {
            const data = await apiFetch('/users/profile');
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

            updateCompletionUI(userData, role);

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

            updateCompletionUI(userData, role);
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
            await apiFetch('/users/profile', {
                method: 'PUT',
                headers: { 'Content-Type':'application/json' },
                body: JSON.stringify(updatedProfileData)
            });
            await loadUserData(role);

            formStatus.textContent = 'Changes saved successfully!';
            formStatus.style.color = 'green';
            const data = JSON.parse(localStorage.getItem('osianUserData')) || {};
            const completion = computeCompletion(data, role);
            if (progressBar) progressBar.style.width = `${completion.percent}%`;
            if (progressPercentEl) progressPercentEl.textContent = `${completion.percent}%`;
            if (profileMissingEl) profileMissingEl.textContent = completion.missing.length ? `Missing: ${completion.missing.join(', ')}` : '';
            localStorage.setItem('profileCompletion', JSON.stringify(completion));
            localStorage.setItem('profileComplete', completion.percent === 100 ? 'true' : 'false');

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
        const maxSizeBytes = 1048576;
        if (file.size > maxSizeBytes) {
            let el = document.getElementById('osian-toast');
            if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
            el.className = 'osian-toast warning';
            el.textContent = 'File size exceeds 1MB limit. Please choose a smaller image.';
            el.classList.add('show');
            clearTimeout(el._hideTimer);
            el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
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
                await apiFetch('/users/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({ profilePicture: avatarDataUrl })
                });

                // Update localStorage
                const currentData = JSON.parse(localStorage.getItem('osianUserData')) || defaultData;
                currentData.avatar = avatarDataUrl;
                saveUserData(currentData);

                loadUserData(getRoleFromURL()); // Reload to show the new avatar

            } catch (error) {
                console.error('Error updating avatar:', error);
                let el = document.getElementById('osian-toast');
                if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
                el.className = 'osian-toast error';
                el.textContent = 'Failed to update avatar. Please try again.';
                el.classList.add('show');
                clearTimeout(el._hideTimer);
                el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
            }
        };
        reader.readAsDataURL(file);
    });

    // Function to get role from URL
    function getRoleFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('role') || 'user'; // Default to 'user' if no role is specified
    }

    function computeCompletion(userData, role){
        var fields = [];
        var missing = [];
        if (role === 'admin' || role === 'superadmin') {
            fields = [
                {k:'name', v:userData.name},
                {k:'phone', v:(userData.mobile||'').replace(/\D/g,'')},
                {k:'city', v:userData.city},
                {k:'organization', v:userData.organization}
            ];
        } else {
            fields = [
                {k:'name', v:userData.name},
                {k:'phone', v:(userData.mobile||'').replace(/\D/g,'')},
                {k:'city', v:userData.city},
                {k:'college', v:userData.college},
                {k:'branch', v:userData.branch},
                {k:'state', v:userData.state}
            ];
        }
        var done = 0;
        fields.forEach(function(f){
            var ok = f.k === 'phone' ? (f.v && f.v.length >= 10) : !!(f.v && String(f.v).trim());
            if (ok) done++; else missing.push(f.k);
        });
        var percent = Math.round((done / fields.length) * 100);
        return { percent: percent, missing: missing };
    }

    // Initial load of user data
    const userRole = getRoleFromURL();
    updateSidebarLinks(userRole);
    loadUserData(userRole);

    ;[nameInput, mobileInput, cityInput, collegeInput, branchInput, stateInput, organizationInput].forEach(function(el){
        if (!el) return;
        el.addEventListener('input', function(){
            var data = getDataFromForm(userRole);
            var storedRaw = localStorage.getItem('osianUserData');
            var stored = {};
            try { stored = storedRaw ? JSON.parse(storedRaw) : {}; } catch(e) { stored = {}; }
            var merged = Object.assign({}, stored, data);
            updateCompletionUI(merged, userRole);
        });
    });
});
