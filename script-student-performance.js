document.addEventListener('DOMContentLoaded', () => {
  const backendPrimary = (location.hostname.endsWith('vercel.app'))
    ? 'https://osiancommunity-backend.vercel.app/api'
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://osiancommunity-backend.vercel.app/api');
  const backendFallback = 'https://osiancommunity-backend.vercel.app/api';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) { window.location.replace('login.html'); return; }
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  async function api(path) {
    const endpoints = backendPrimary === backendFallback ? [backendPrimary] : [backendPrimary, backendFallback];
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const res = await fetch(`${endpoints[i]}${path}`, { headers });
        if (!res.ok) {
          if (res.status === 404 && i < endpoints.length - 1) continue;
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || `Request failed (${res.status})`);
        }
        return await res.json();
      } catch (err) {
        if (i === endpoints.length - 1) throw err;
      }
    }
  }

  const overviewEl = document.getElementById('overview');
  const attemptsEl = document.getElementById('attempts');

  function meter(label, value) {
    const card = document.createElement('div');
    card.className = 'content-card small';
    const bar = document.createElement('div');
    bar.style.height = '10px'; bar.style.background = '#e5e7eb'; bar.style.borderRadius = '999px';
    const fill = document.createElement('div');
    fill.style.height = '10px'; fill.style.width = `${Math.min(100, Math.max(0, value))}%`;
    fill.style.background = 'linear-gradient(90deg,#2563eb,#3b82f6)'; fill.style.borderRadius = '999px';
    bar.appendChild(fill);
    card.innerHTML = `<strong>${label}</strong><p>${value}%</p>`;
    card.appendChild(bar);
    return card;
  }

  function renderAttempts(items) {
    attemptsEl.innerHTML = '';
    items.forEach(a => {
      const row = document.createElement('div');
      row.className = 'btn-action';
      row.innerHTML = `<span>${a.quizTitle || 'Quiz'}</span><span style="margin-left:auto;">Score: ${a.score || 0}</span><span style="margin-left:16px;">Accuracy: ${(a.accuracy||0)}%</span>`;
      attemptsEl.appendChild(row);
    });
  }

  async function load() {
    try {
      const data = await api(`/performance/${user.id}`);
      overviewEl.innerHTML = '';
      overviewEl.appendChild(meter('Average Score', data.averageScore || 0));
      overviewEl.appendChild(meter('Completion Rate', data.completionRate || 0));
      overviewEl.appendChild(meter('Accuracy', data.accuracy || 0));
      overviewEl.appendChild(meter('Consistency', data.consistency || 0));
      renderAttempts((data.recentAttempts)||[]);
    } catch (e) {
      showToast(e.message || 'Failed to load performance', 'error');
    }
  }

  function connectWS() {
    try {
      const wsUrl = backendPrimary.startsWith('http') ? backendPrimary.replace('http', 'ws').replace('/api','') + '/ws/performance' : '';
      const sock = new WebSocket(wsUrl);
      sock.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'performance_update' && msg.userId === user.id) load();
        } catch (_) {}
      };
    } catch (_) {}
  }

  load();
  connectWS();
});
