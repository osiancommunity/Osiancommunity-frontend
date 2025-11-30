document.addEventListener('DOMContentLoaded', () => {
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

  // Periodically refresh the JWT token to prevent session expiration
  async function refreshToken() {
    const token = localStorage.getItem('token');
    if (!token) {
      return; // No token to refresh
    }

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
        if (data.token) {
          localStorage.setItem('token', data.token);
          console.log('Token refreshed successfully');
        } else {
          console.warn('No token received on refresh');
        }
      } else {
        console.warn('Token refresh failed, clearing token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
  }

  // Refresh token every 15 minutes
  setInterval(refreshToken, 15 * 60 * 1000);

  // Initial call on page load
  refreshToken();
});
