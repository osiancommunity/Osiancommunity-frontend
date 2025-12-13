const backendUrl = (location.hostname.endsWith('vercel.app'))
  ? 'https://osiancommunity-backend.vercel.app/api'
  : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://osiancommunity-backend.vercel.app/api');

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const scopeEl = document.getElementById('lb-scope');
  const periodEl = document.getElementById('lb-period');
  const searchEl = document.getElementById('lb-search');
  const hero = document.getElementById('lb-hero');
  const listEl = document.getElementById('lb-list');
  const mini = document.getElementById('lb-user-mini');

  async function fetchLeaderboard(scope, period){
    try {
      const query = new URLSearchParams({ scope, period }).toString();
      const res = await fetch(`${backendUrl}/leaderboard?${query}`, { headers: { ...(token?{ 'Authorization':`Bearer ${token}` }: {}) } });
      const data = await res.json();
      const list = (data.leaderboard||[]);
      window._lbAll = list;
      render(list);
    } catch(_) { render([]); }
  }

  function render(list){
    if (!hero || !listEl) return;
    const top3 = list.slice(0,3);
    const rest = list.slice(3);
    hero.innerHTML = top3.map((x, i) => {
      const cls = i===0 ? 'lb-hero-card gold' : i===1 ? 'lb-hero-card silver' : 'lb-hero-card bronze';
      const name = x.display_name || 'User';
      const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
      const avatarEl = x.avatar_url ? `<img src="${x.avatar_url}" loading="lazy" alt="${name}" class="avatar">` : `<div class="initials avatar">${initials}</div>`;
      const score = Math.round(x.composite_score || 0);
      return `<div class="${cls}" role="button" tabindex="0"><div class="medal">${x.rank}</div>${avatarEl}<div class="name">${name}</div><div class="meta">${x.college || ''}</div><div class="score">${score}</div></div>`;
    }).join('');
    listEl.innerHTML = rest.map((x) => {
      const name = x.display_name || 'User';
      const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
      const avatarEl = x.avatar_url ? `<img src="${x.avatar_url}" loading="lazy" alt="${name}" class="avatar">` : `<div class="initials">${initials}</div>`;
      const spark = (x.sparkline || []).slice(0,20);
      const path = spark.map((v, idx) => `${idx===0?'M':'L'} ${idx*6} ${24 - Math.min(24, Math.max(0, v/5))}`).join(' ');
      const score = Math.round(x.avg_score || 0);
      const attempts = x.attempts || 0;
      const badges = (x.badges || []).map(b => `<div class="badge" title="${b.name}"><span class="badge-icon">🏅</span><span>${b.name}</span></div>`).join('');
      return `<div class="lb-row"><div class="rank">${x.rank}</div>${avatarEl}<div class="content"><div class="title">${name}</div><div class="meta">Avg ${score} • Attempts ${attempts}</div><svg class="spark" viewBox="0 0 120 24"><path d="${path}" stroke="#4C8DFF" fill="none" stroke-width="2"/></svg><div class="badges">${badges}</div></div></div>`;
    }).join('');
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const me = list.find(x => String(x.user_id) === String(user._id));
    if (me && me.rank > 3) {
      mini.classList.add('active');
      const score = Math.round(me.composite_score || 0);
      const name = me.display_name || 'You';
      const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
      const avatarEl = me.avatar_url ? `<img src="${me.avatar_url}" loading="lazy" alt="${name}" class="avatar" style="width:var(--avatar-sm);height:var(--avatar-sm);">` : `<div class="initials" style="width:var(--avatar-sm);height:var(--avatar-sm);">${initials}</div>`;
      mini.innerHTML = `${avatarEl}<div class="content"><div class="title">You • Rank ${me.rank}</div><div class="meta">${score}</div></div><a class="btn-edit" href="profile.html">View profile</a>`;
    } else { mini.classList.remove('active'); mini.innerHTML = ''; }
  }

  const apply = ()=>{ fetchLeaderboard(scopeEl.value, periodEl.value); };
  scopeEl.onchange = apply; periodEl.onchange = apply; apply();
  searchEl.oninput = ()=>{ const q = searchEl.value.toLowerCase(); render((window._lbAll||[]).filter(x => String(x.display_name||'').toLowerCase().includes(q))); };
});
