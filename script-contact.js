document.addEventListener("DOMContentLoaded", function() {

    // --- Sidebar Active Link Logic ---
    // (This is already in script-dashboard.js, but if you want
    // this page to be standalone, you'd add it here)
    
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        // Check if link's href matches current page
        if (link.href === window.location.href) {
            // Remove 'active' from all
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Add 'active' to this link
            link.classList.add('active');
        }
    });

    // --- Super Chat Form Submission ---
    const chatForm = document.getElementById('super-chat-form');
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;

        if (subject && message) {
            // In a real app, send this data to the Super Admin's backend
            console.log("Super Chat Submitted:");
            console.log("Subject:", subject);
            console.log("Message:", message);

            alert('Your message has been sent to the Super Admin! (Demo)');
            chatForm.reset();
        } else {
            alert('Please fill out all fields.');
        }
    });

});