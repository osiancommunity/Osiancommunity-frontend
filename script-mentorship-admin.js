document.addEventListener('DOMContentLoaded', () => {
  const backendUrl = (location.hostname.endsWith('vercel.app'))
    ? 'https://osiancommunity-backend.vercel.app/api'
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://osiancommunity-backend.vercel.app/api');

  const token = localStorage.getItem('token');
  let user = null;
  try { user = JSON.parse(localStorage.getItem('user')); } catch(_) { user = null; }
  if (!token || !user || !['admin','superadmin'].includes((user.role||'').toLowerCase())) {
    alert('Access Denied');
    window.location.href = 'login.html';
    return;
  }

  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) { logoutBtn.style.display = 'none'; }

  const container = document.getElementById('video-list-container');
  const addBtn = document.getElementById('add-video-btn');
  const saveBtn = document.getElementById('save-mentorship-btn');

  let videos = [];

  function render() {
    if (!container) return;
    container.innerHTML = '';
    videos.forEach((v, idx) => {
      const div = document.createElement('div');
      div.className = 'content-card small';
      div.style.marginBottom = '16px';
      div.innerHTML = `
        <label>Title</label>
        <input type="text" data-field="title" data-index="${idx}" value="${v.title || ''}" />
        <label>Description</label>
        <textarea data-field="description" data-index="${idx}">${v.description || ''}</textarea>
        <label>Video URL</label>
        <input type="text" data-field="url" data-index="${idx}" value="${v.url || ''}" />
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn-delete" data-action="delete" data-index="${idx}">Remove</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  async function fetchVideos() {
    try {
      const res = await fetch(`${backendUrl}/mentorship/admin/videos`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      videos = Array.isArray(data) ? data : (data.videos || []);
      render();
    } catch(e) {
      videos = [];
      render();
    }
  }

  addBtn?.addEventListener('click', () => {
    videos.push({ title: '', description: '', url: '' });
    render();
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    const idx = el.getAttribute('data-index');
    const field = el.getAttribute('data-field');
    if (idx !== null && field) {
      const i = parseInt(idx, 10);
      videos[i] = { ...videos[i], [field]: el.value };
    }
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const idx = btn.getAttribute('data-index');
    if (action === 'delete' && idx !== null) {
      const v = videos[parseInt(idx,10)];
      if (v && v._id) {
        try {
          await fetch(`${backendUrl}/mentorship/admin/videos/${v._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        } catch(_){ }
      }
      videos.splice(parseInt(idx,10), 1);
      render();
    }
  });

  saveBtn?.addEventListener('click', async () => {
    try {
      for (const v of videos) {
        if (v._id) {
          await fetch(`${backendUrl}/mentorship/admin/videos/${v._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: v.title, description: v.description, url: v.url })
          });
        } else {
          const res = await fetch(`${backendUrl}/mentorship/admin/videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: v.title, description: v.description, url: v.url })
          });
          const data = await res.json();
          if (res.ok && data && data._id) {
            v._id = data._id;
          }
        }
      }
      alert('Mentorship videos saved');
      fetchVideos();
    } catch(e) {
      alert('Failed to save mentorship videos');
    }
  });

  fetchVideos();
});

