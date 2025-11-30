document.addEventListener('DOMContentLoaded', () => {
  const backendUrl = (location.hostname.endsWith('vercel.app'))
    ? 'https://osiancommunity-backend.vercel.app/api'
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://osiancommunity-backend.vercel.app/api');

  // Periodically refresh the JWT token to prevent session expiration
  async function refreshToken() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${backendUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.token) {
          localStorage.setItem('token', data.token);
        }
        return;
      }

      // Only force logout on explicit 401; otherwise, ignore (endpoint may not exist)
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
      }
    } catch (_) {
      // Network or endpoint missing: do nothing to avoid breaking session
    }
  }

  // Refresh token every 15 minutes
  setInterval(refreshToken, 15 * 60 * 1000);

  // Initial call on page load
  refreshToken();
});
