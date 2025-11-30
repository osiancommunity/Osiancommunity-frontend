document.addEventListener('DOMContentLoaded', function () {
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

            alert('Profile updated successfully!');
        });
    }
});