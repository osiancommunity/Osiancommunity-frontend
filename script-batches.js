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

  async function api(path, method, payload) {
    const endpoints = backendPrimary === backendFallback ? [backendPrimary] : [backendPrimary, backendFallback];
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const res = await fetch(`${endpoints[i]}${path}`, { method, headers, body: payload ? JSON.stringify(payload) : undefined });
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

  const batchList = document.getElementById('batch-list');
  const batchDetails = document.getElementById('batch-details');
  const searchInput = document.getElementById('batch-search');
  const sortSelect = document.getElementById('batch-sort');
  const enrollEmail = document.getElementById('enroll-email');
  const enrollBtn = document.getElementById('btn-enroll');
  const enrollStatus = document.getElementById('enroll-status');

  const modal = document.getElementById('modal-create-batch');
  const btnCreate = document.getElementById('btn-create-batch');
  const btnClose = document.getElementById('btn-close-modal');
  const btnSave = document.getElementById('btn-save-batch');
  const nameInput = document.getElementById('batch-name');
  const startInput = document.getElementById('batch-start');
  const descInput = document.getElementById('batch-desc');

  let selectedBatch = null;
  let batches = [];

  function renderBatches(list) {
    batchList.innerHTML = '';
    list.forEach(b => {
      const card = document.createElement('div');
      card.className = 'content-card small';
      card.style.cursor = 'pointer';
      card.innerHTML = `<strong>${b.name}</strong><p>Students: ${b.size || 0}</p><p>Start: ${b.startDate ? new Date(b.startDate).toLocaleDateString() : '-'}</p>`;
      card.addEventListener('click', () => { selectedBatch = b; renderBatchDetails(); });
      batchList.appendChild(card);
    });
  }

  function renderBatchDetails() {
    if (!selectedBatch) { batchDetails.innerHTML = '<p>Select a batch to view details.</p>'; return; }
    batchDetails.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4>${selectedBatch.name}</h4>
        <button class="btn btn-secondary" id="btn-refresh-batch">Refresh</button>
      </div>
      <p>${selectedBatch.description || ''}</p>
      <div class="grid two-cols" style="gap:12px; margin-top:12px;">
        <div class="content-card small"><strong>Size</strong><p>${selectedBatch.size || 0}</p></div>
        <div class="content-card small"><strong>Start</strong><p>${selectedBatch.startDate ? new Date(selectedBatch.startDate).toLocaleDateString() : '-'}</p></div>
      </div>
      <div style="margin-top:16px;">
        <h4>Students</h4>
        <div id="batch-students"></div>
      </div>
    `;
    const refreshBtn = document.getElementById('btn-refresh-batch');
    if (refreshBtn) refreshBtn.addEventListener('click', loadBatchDetails);
    loadBatchDetails();
  }

  async function loadBatches() {
    try {
      const data = await api('/batches', 'GET');
      batches = Array.isArray(data) ? data : (data && data.items) || [];
      const q = (searchInput.value || '').toLowerCase();
      let filtered = batches.filter(b => b.name.toLowerCase().includes(q));
      const sort = sortSelect.value;
      if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
      if (sort === 'size') filtered.sort((a,b) => (b.size||0)-(a.size||0));
      renderBatches(filtered);
    } catch (e) {
      showToast(e.message || 'Failed to load batches', 'error');
    }
  }

  async function loadBatchDetails() {
    if (!selectedBatch) return;
    try {
      const details = await api(`/batches/${selectedBatch.id}`, 'GET');
      const students = (details && details.students) || [];
      const container = document.getElementById('batch-students');
      container.innerHTML = '';
      students.forEach(s => {
        const row = document.createElement('div');
        row.className = 'btn-action';
        row.innerHTML = `<span>${s.name || s.email}</span><span style="margin-left:auto;">Score: ${s.score || 0}</span>`;
        container.appendChild(row);
      });
    } catch (e) {
      showToast(e.message || 'Failed to load batch details', 'error');
    }
  }

  btnCreate.addEventListener('click', () => { modal.style.display = 'block'; });
  btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
  btnSave.addEventListener('click', async () => {
    try {
      const payload = { name: nameInput.value, startDate: startInput.value, description: descInput.value };
      const created = await api('/batches', 'POST', payload);
      showToast('Batch created', 'success');
      modal.style.display = 'none';
      await loadBatches();
      selectedBatch = created;
      renderBatchDetails();
    } catch (e) {
      showToast(e.message || 'Failed to create batch', 'error');
    }
  });

  enrollBtn.addEventListener('click', async () => {
    if (!selectedBatch) { enrollStatus.textContent = 'Select a batch first'; enrollStatus.style.color = 'red'; return; }
    try {
      const data = await api(`/batches/${selectedBatch.id}/enroll`, 'POST', { email: enrollEmail.value });
      enrollStatus.textContent = 'Enrolled successfully';
      enrollStatus.style.color = 'green';
      await loadBatchDetails();
    } catch (e) {
      enrollStatus.textContent = e.message || 'Failed to enroll';
      enrollStatus.style.color = 'red';
    }
    setTimeout(() => { enrollStatus.textContent = ''; }, 3000);
  });

  searchInput.addEventListener('input', loadBatches);
  sortSelect.addEventListener('change', loadBatches);

  function connectWS() {
    try {
      const wsUrl = backendPrimary.startsWith('http') ? backendPrimary.replace('http', 'ws').replace('/api','') + '/ws/batches' : '';
      const sock = new WebSocket(wsUrl);
      sock.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'batch_updated') loadBatches();
        } catch (_) {}
      };
    } catch (_) {}
  }

  loadBatches();
  connectWS();
});
