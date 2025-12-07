const backendUrl = (location.hostname.endsWith('vercel.app'))
  ? 'https://osiancommunity-backend.vercel.app/api'
  : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://osiancommunity-backend.vercel.app/api');

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const tbody = document.querySelector('#leaderboard-table tbody');
  const scopeEl = document.getElementById('lb-scope');
  const periodEl = document.getElementById('lb-period');
  const searchEl = document.getElementById('lb-search');

  async function fetchLeaderboard(scope, period){
    try {
      const query = new URLSearchParams({ scope, period }).toString();
      const res = await fetch(`${backendUrl}/leaderboard?${query}`, { headers: { ...(token?{ 'Authorization':`Bearer ${token}` }: {}) } });
      const data = await res.json();
      const list = (data.leaderboard||[]).map(x => ({
        rank: x.rank,
        name: x.display_name || 'User',
        avatar: x.avatar_url || '',
        score: Math.round(x.composite_score || 0),
        likes: x.attempts || 0, // placeholder metrics aligning with provided image columns
        saved: Math.round(x.avg_score || 0),
        share: (x.sparkline||[]).length
      }));
      render(list);
      window._lbAll = list;
    } catch(_) { render([]); }
  }

  function render(list){
    if (!tbody) return;
    const rows = list.map((u)=>{
      const medal = u.rank<=3 ? `<span class="medal medal-${u.rank}">${u.rank}</span>` : u.rank;
      const avatar = u.avatar ? `<img src="${u.avatar}" loading="lazy" alt="${u.name}" class="lb-avatar">` : `<div class="lb-avatar initials">${(u.name||'U').slice(0,1).toUpperCase()}</div>`;
      return `<tr><td>${medal}</td><td>${avatar} ${u.name}</td><td>${u.likes}</td><td>${u.saved}</td><td>${u.share}</td><td>${u.score}</td></tr>`;
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="6">No data</td></tr>';
  }

  const apply = ()=>{ fetchLeaderboard(scopeEl.value, periodEl.value); };
  scopeEl.onchange = apply; periodEl.onchange = apply; apply();
  searchEl.oninput = ()=>{ const q = searchEl.value.toLowerCase(); render((window._lbAll||[]).filter(x => x.name.toLowerCase().includes(q))); };
});
