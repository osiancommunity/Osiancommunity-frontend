document.addEventListener("DOMContentLoaded", function() {
    function showToast(message, type){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast ' + (type || '');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
    }

    const form = document.getElementById('contact-info-form');
    // Load initial content (Dummy function - replace with backend fetch)
    function loadContactInfo() {
        const info = JSON.parse(localStorage.getItem('contactInfo')) || {
            email: 'support@osian.com',
            phone: '+1234567890',
            address: '123 Quiz Street, Knowledge City, IN',
            facebook: '',
            twitter: '',
            linkedin: ''
        };

        document.getElementById('support-email').value = info.email;
        document.getElementById('support-phone').value = info.phone;
        document.getElementById('office-address').value = info.address;
        document.getElementById('facebook-url').value = info.facebook;
        document.getElementById('twitter-url').value = info.twitter;
        document.getElementById('linkedin-url').value = info.linkedin;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const updatedInfo = {
            email: document.getElementById('support-email').value,
            phone: document.getElementById('support-phone').value,
            address: document.getElementById('office-address').value,
            facebook: document.getElementById('facebook-url').value,
            twitter: document.getElementById('twitter-url').value,
            linkedin: document.getElementById('linkedin-url').value
        };

        // Save All Changes (Dummy function - replace with backend API call)
        localStorage.setItem('contactInfo', JSON.stringify(updatedInfo));
        showToast('Contact information updated successfully!', 'success');
    });

    loadContactInfo();
});
