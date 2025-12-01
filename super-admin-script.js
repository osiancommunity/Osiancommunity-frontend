document.addEventListener('DOMContentLoaded', function () {
    function showToast(message, type){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast ' + (type || '');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
    }
    // Basic script to toggle between admin sections
    const sidebarLinks = document.querySelectorAll('.admin-sidebar a');
    const adminSections = document.querySelectorAll('.admin-section');

    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            adminSections.forEach(section => section.style.display = 'none');
            document.querySelector(this.getAttribute('href')).style.display = 'block';
            sidebarLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Handle profile form submission
    const profileForm = document.getElementById('admin-profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent actual form submission
            const adminNameInput = document.getElementById('admin-name');
            const adminName = adminNameInput.value;
            const adminEmail = document.getElementById('admin-email').value;

            // Simulate saving data
            console.log('Simulating profile update with:', { name: adminName, email: adminEmail });

            // Update the welcome message in the header
            const welcomeMessage = document.querySelector('.profile-header p');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome, ${adminName}`;
            }

            showToast('Profile updated successfully!', 'success');
        });
    }
});
