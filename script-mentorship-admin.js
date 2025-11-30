document.addEventListener("DOMContentLoaded", function() {

    // Backend URL
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

    // Get user and token from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Security check
    if (!token || !user || user.role !== 'superadmin') {
        window.location.href = 'login.html';
        return;
    }

    const container = document.getElementById('video-list-container');
    const saveBtn = document.getElementById('save-mentorship-btn');
    const addBtn = document.getElementById('add-video-btn');

    let videos = [];

    // Load mentorship videos from backend
    async function loadContent() {
        try {
            const response = await fetch(`${backendUrl}/mentorship/admin/videos`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Failed to fetch videos');
            }

            const data = await response.json();
            videos = data.videos || [];
            container.innerHTML = '';
            videos.forEach((video, index) => renderVideoCard(video, index + 1));
        } catch (error) {
            console.error('Error loading videos:', error);
            alert('Failed to load mentorship videos. Please try again.');
        }
    }

    function renderVideoCard(video, index) {
        const card = document.createElement('div');
        card.className = 'video-editor-card content-card';
        card.setAttribute('data-video-id', video._id);
        card.innerHTML = `
            <h4>Video ${index}: ${video.title}</h4>
            <div class="form-group">
                <label>Title</label>
                <input type="text" value="${video.title}" class="video-title-input">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="video-desc-input">${video.description}</textarea>
            </div>
            <div class="form-group">
                <label>Video URL</label>
                <input type="url" value="${video.url}" class="video-url-input">
            </div>
            <div class="form-group">
                <label>Thumbnail URL (Optional)</label>
                <input type="url" value="${video.thumbnail || ''}" class="video-thumbnail-input" placeholder="https://example.com/thumbnail.jpg">
            </div>
            <div class="form-group">
                <label>Duration (Optional)</label>
                <input type="text" value="${video.duration || ''}" class="video-duration-input" placeholder="e.g., 15 min">
            </div>
            <div class="form-group">
                <label>Views: ${video.views || 0}</label>
            </div>
            <button class="btn-action remove-video-btn" style="background: #e74c3c; color: white; border: none;">
                <i class='bx bx-trash'></i> Remove Video
            </button>
        `;
        container.appendChild(card);
    }

    // Add New Video Slot
    addBtn.addEventListener('click', () => {
        const index = container.children.length + 1;
        renderVideoCard({
            _id: 'new-' + Date.now(),
            title: "New Video",
            description: "Add video description here.",
            url: "",
            thumbnail: "",
            duration: "",
            views: 0
        }, index);
    });

    // Remove Video Slot
    container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-video-btn')) {
            if (confirm("Are you sure you want to remove this video?")) {
                const card = e.target.closest('.video-editor-card');
                const videoId = card.getAttribute('data-video-id');

                // If it's a new video (not saved yet), just remove from DOM
                if (videoId.startsWith('new-')) {
                    card.remove();
                    return;
                }

                // Delete from backend
                try {
                    const response = await fetch(`${backendUrl}/mentorship/admin/videos/${videoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to delete video');
                    }

                    alert('Video deleted successfully!');
                    loadContent(); // Refresh the list
                } catch (error) {
                    console.error('Error deleting video:', error);
                    alert('Failed to delete video. Please try again.');
                }
            }
        }
    });

    // Save All Changes
    saveBtn.addEventListener('click', async () => {
        const cards = document.querySelectorAll('.video-editor-card');
        let hasErrors = false;

        for (let card of cards) {
            const videoId = card.getAttribute('data-video-id');
            const title = card.querySelector('.video-title-input').value.trim();
            const description = card.querySelector('.video-desc-input').value.trim();
            const url = card.querySelector('.video-url-input').value.trim();
            const thumbnail = card.querySelector('.video-thumbnail-input').value.trim();
            const duration = card.querySelector('.video-duration-input').value.trim();

            if (!title || !description || !url) {
                alert('Please fill in all required fields (Title, Description, URL) for all videos.');
                hasErrors = true;
                break;
            }

            try {
                let response;
                const videoData = { title, description, url, thumbnail, duration };

                if (videoId.startsWith('new-')) {
                    // Create new video
                    response = await fetch(`${backendUrl}/mentorship/admin/videos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(videoData)
                    });
                } else {
                    // Update existing video
                    response = await fetch(`${backendUrl}/mentorship/admin/videos/${videoId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(videoData)
                    });
                }

                if (!response.ok) {
                    throw new Error('Failed to save video');
                }
            } catch (error) {
                console.error('Error saving video:', error);
                alert('Failed to save one or more videos. Please try again.');
                hasErrors = true;
                break;
            }
        }

        if (!hasErrors) {
            alert('Mentorship videos updated and saved successfully!');
            loadContent(); // Refresh the list
        }
    });

    loadContent();
});
