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

  const scopeEl = document.getElementById('scope');
  const rangeEl = document.getElementById('range');
  const sortEl = document.getElementById('sort');
  const batchFilterEl = document.getElementById('batchFilter');
  const leaderboardEl = document.getElementById('leaderboard');
  const myPerfEl = document.getElementById('my-performance');

  function buildPerfCard(label, value, accent) {
    const card = document.createElement('div');
    card.className = 'content-card small';
    const bar = document.createElement('div');
    bar.style.height = '10px';
    bar.style.background = '#e5e7eb';
    bar.style.borderRadius = '999px';
    const fill = document.createElement('div');
    fill.style.height = '10px';
    fill.style.width = `${Math.min(100, Math.max(0, value))}%`;
    fill.style.background = accent || 'linear-gradient(90deg,#2563eb,#3b82f6)';
    fill.style.borderRadius = '999px';
    bar.appendChild(fill);
    card.innerHTML = `<strong>${label}</strong><p>${value}%</p>`;
    card.appendChild(bar);
    return card;
  }

  function renderLeaderboard(items) {
    leaderboardEl.innerHTML = '';
    items.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'btn-action';
      row.innerHTML = `<span>#${idx+1} ${it.name || it.email}</span><span style="margin-left:auto;">Score: ${it.score || 0}</span><span style="margin-left:16px;">Acc: ${(it.accuracy||0)}%</span>`;
      leaderboardEl.appendChild(row);
    });
  }

  async function loadLeaderboard() {
    try {
      const scope = scopeEl.value;
      const range = rangeEl.value;
      const batchParam = batchFilterEl.value ? `&batch=${encodeURIComponent(batchFilterEl.value)}` : '';
      const data = await api(`/leaderboard?scope=${scope}&range=${range}${batchParam}`);
      let items = Array.isArray(data) ? data : (data && data.items) || [];
      const sort = sortEl.value;
      if (sort === 'score') items.sort((a,b) => (b.score||0)-(a.score||0));
      if (sort === 'accuracy') items.sort((a,b) => (b.accuracy||0)-(a.accuracy||0));
      renderLeaderboard(items);
      const me = items.find(i => i.id === user.id) || {};
      myPerfEl.innerHTML = '';
      myPerfEl.appendChild(buildPerfCard('Accuracy', me.accuracy||0));
      myPerfEl.appendChild(buildPerfCard('Completion', me.completion||0));
      myPerfEl.appendChild(buildPerfCard('Consistency', me.consistency||0));
      myPerfEl.appendChild(buildPerfCard('Improvement', me.improvement||0));
    } catch (e) {
      showToast(e.message || 'Failed to load leaderboard', 'error');
    }
  }

  scopeEl.addEventListener('change', () => {
    batchFilterEl.style.display = scopeEl.value === 'batch' ? '' : 'none';
    loadLeaderboard();
  });
  rangeEl.addEventListener('change', loadLeaderboard);
  sortEl.addEventListener('change', loadLeaderboard);
  batchFilterEl.addEventListener('input', loadLeaderboard);

  function connectWS() {
    try {
      const wsUrl = backendPrimary.startsWith('http') ? backendPrimary.replace('http', 'ws').replace('/api','') + '/ws/leaderboard' : '';
      const sock = new WebSocket(wsUrl);
      sock.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'leaderboard_update') loadLeaderboard();
        } catch (_) {}
      };
    } catch (_) {}
  }

  loadLeaderboard();
  connectWS();
});
