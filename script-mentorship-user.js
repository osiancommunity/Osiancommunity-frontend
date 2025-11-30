document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

    // --- User & Logout Logic ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Check if user is logged in
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Load user avatar from profile data
    const userData = JSON.parse(localStorage.getItem('osianUserData')) || {};
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar && userData.avatar) {
        headerAvatar.src = userData.avatar;
    }

    // Handle Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // --- Elements ---
    const searchInput = document.getElementById('search-input');
    const videoGrid = document.getElementById('video-grid');
    const modal = document.getElementById('video-modal');
    const modalClose = document.querySelector('.close-modal');
    const videoIframe = document.getElementById('video-iframe');
    const modalTitle = document.getElementById('modal-video-title');
    const modalDescription = document.getElementById('modal-video-description');
    const videoThumbnailContainer = document.getElementById('video-thumbnail-container');
    const modalVideoThumbnail = document.getElementById('modal-video-thumbnail');
    const watchNowBtn = document.getElementById('watch-now-btn');

    let allVideos = [];
    let currentVideo = null;

    // --- Fetch Mentorship Videos ---
    async function fetchMentorshipVideos() {
        try {
            const response = await fetch(`${backendUrl}/mentorship/videos`, {
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
            allVideos = data.videos || [];
            renderVideos(allVideos);
        } catch (error) {
            console.error('Error fetching videos:', error);
            // Show placeholder videos if API fails
            renderVideos([]);
        }
    }

    // --- Render Videos ---
    function renderVideos(videos) {
        videoGrid.innerHTML = '';

        if (videos.length === 0) {
            // Show placeholder videos
            videoGrid.innerHTML = `
                <div class="video-card">
                    <div class="video-thumbnail">
                        <img src="https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=Video+Thumbnail" alt="Video Thumbnail">
                        <div class="play-button">
                            <i class='bx bx-play'></i>
                        </div>
                    </div>
                    <div class="video-info">
                        <h3>How to Prepare for Technical Quizzes</h3>
                        <p>Essential strategies for core subjects and technical topics.</p>
                        <div class="video-meta">
                            <span><i class='bx bx-time'></i> 15 min</span>
                            <span><i class='bx bx-show'></i> 1.2k views</span>
                        </div>
                    </div>
                </div>

                <div class="video-card">
                    <div class="video-thumbnail">
                        <img src="https://via.placeholder.com/300x200/2196F3/FFFFFF?text=Video+Thumbnail" alt="Video Thumbnail">
                        <div class="play-button">
                            <i class='bx bx-play'></i>
                        </div>
                    </div>
                    <div class="video-info">
                        <h3>General Knowledge Quiz Tips</h3>
                        <p>Improve your GK scores with these proven techniques.</p>
                        <div class="video-meta">
                            <span><i class='bx bx-time'></i> 12 min</span>
                            <span><i class='bx bx-show'></i> 890 views</span>
                        </div>
                    </div>
                </div>

                <div class="video-card">
                    <div class="video-thumbnail">
                        <img src="https://via.placeholder.com/300x200/FF9800/FFFFFF?text=Video+Thumbnail" alt="Video Thumbnail">
                        <div class="play-button">
                            <i class='bx bx-play'></i>
                        </div>
                    </div>
                    <div class="video-info">
                        <h3>Time Management in Quizzes</h3>
                        <p>Learn how to manage your time effectively during quizzes.</p>
                        <div class="video-meta">
                            <span><i class='bx bx-time'></i> 10 min</span>
                            <span><i class='bx bx-show'></i> 654 views</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        videos.forEach(video => {
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <div class="video-thumbnail">
                    <img src="${video.thumbnail || 'https://via.placeholder.com/300x200/666/FFFFFF?text=Video'}" alt="Video Thumbnail">
                    <div class="play-button" data-video-id="${video._id}">
                        <i class='bx bx-play'></i>
                    </div>
                </div>
                <div class="video-info">
                    <h3>${video.title}</h3>
                    <p>${video.description}</p>
                    <div class="video-meta">
                        <span><i class='bx bx-time'></i> ${video.duration || 'N/A'}</span>
                        <span><i class='bx bx-show'></i> ${video.views || 0} views</span>
                    </div>
                </div>
            `;
            videoGrid.appendChild(videoCard);
        });
    }

    // --- Handle Video Play ---
    videoGrid.addEventListener('click', async (e) => {
        if (e.target.closest('.play-button')) {
            const playButton = e.target.closest('.play-button');
            const videoId = playButton.getAttribute('data-video-id');

            // Find video data
            currentVideo = allVideos.find(v => v._id === videoId) || {
                title: "Sample Video",
                description: "This is a sample mentorship video.",
                url: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
                thumbnail: "https://via.placeholder.com/300x200/666/FFFFFF?text=Video"
            };

            modalTitle.textContent = currentVideo.title;
            modalDescription.textContent = currentVideo.description;
            modalVideoThumbnail.src = currentVideo.thumbnail || "https://via.placeholder.com/300x200/666/FFFFFF?text=Video";
            videoThumbnailContainer.style.display = 'block';
            videoIframe.style.display = 'none';
            modal.style.display = 'flex';

            // Increment view count if video exists
            if (videoId && currentVideo._id) {
                try {
                    await fetch(`${backendUrl}/mentorship/videos/${videoId}/views`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    // Refresh videos to update view count
                    fetchMentorshipVideos();
                } catch (error) {
                    console.error('Error incrementing views:', error);
                }
            }
        }
    });

    // --- Handle Watch Now Button ---
    watchNowBtn.addEventListener('click', () => {
        videoThumbnailContainer.style.display = 'none';
        videoIframe.src = currentVideo.url;
        videoIframe.style.display = 'block';
    });

    // --- Close Modal ---
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
        videoIframe.src = '';
        videoThumbnailContainer.style.display = 'block';
        videoIframe.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            videoIframe.src = '';
            videoThumbnailContainer.style.display = 'block';
            videoIframe.style.display = 'none';
        }
    });

    // --- Search Functionality ---
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredVideos = allVideos.filter(video =>
            video.title.toLowerCase().includes(searchTerm) ||
            video.description.toLowerCase().includes(searchTerm)
        );
        renderVideos(filteredVideos);
    });

    // --- Initial Load ---
    fetchMentorshipVideos();
});
