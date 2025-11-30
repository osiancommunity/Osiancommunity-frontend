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

  const urlParams = new URLSearchParams(window.location.search);
  const quizIdParam = urlParams.get('quizId');

  const quizFilter = document.getElementById('quiz-filter');
  const tableBody = document.querySelector('#results-table tbody');
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const releaseBtn = document.getElementById('release-btn');
  const releaseMessageInput = document.getElementById('release-message');
  const releaseSendNotify = document.getElementById('release-send-notify');

  let results = [];
  let currentPage = 1;
  let totalPages = 1;
  let selectedIds = new Set();

  async function fetchQuizzesForFilter() {
    try {
      const res = await fetch(`${backendUrl}/quizzes/admin`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      const list = data.quizzes || [];
      quizFilter.innerHTML = '<option value="all">All Quizzes</option>';
      list.forEach(q => {
        const opt = document.createElement('option');
        opt.value = q._id;
        opt.textContent = q.title;
        quizFilter.appendChild(opt);
      });
      if (quizIdParam) quizFilter.value = quizIdParam;
    } catch(_) { }
  }

  async function fetchResults(page = 1) {
    currentPage = page;
    const quizId = (quizFilter?.value && quizFilter.value !== 'all') ? quizFilter.value : (quizIdParam || null);
    try {
      let url = `${backendUrl}/results/admin?page=${page}&limit=10`;
      if (quizId) {
        url = `${backendUrl}/results/quiz/${quizId}?page=${page}&limit=10`;
      }
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      const arr = quizId ? (data.results || []) : (data.results || []);
      results = arr;
      totalPages = data.pagination ? data.pagination.totalPages : 1;
      renderResults();
    } catch(e) {
      tableBody.innerHTML = '<tr><td colspan="9">Failed to load results.</td></tr>';
    }
  }

  function renderResults() {
    tableBody.innerHTML = '';
    selectedIds.clear();
    if (!results || results.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="9">No results found.</td></tr>';
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage >= totalPages;
      return;
    }
    results.forEach(r => {
      const tr = document.createElement('tr');
      const pct = r.totalQuestions ? Math.round((r.score / r.totalQuestions) * 100) : (r.percentage || 0);
      tr.innerHTML = `
        <td><input type="checkbox" data-id="${r._id}"></td>
        <td>${r.userId?.name || '-'}</td>
        <td>${r.userId?.email || '-'}</td>
        <td>${r.score ?? '-'}</td>
        <td>${pct}</td>
        <td>${r.timeTaken ?? '-'}</td>
        <td>${r.status || '-'}</td>
        <td>${r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}</td>
        <td><button class="btn-edit" data-action="view" data-id="${r._id}">View</button></td>
      `;
      tableBody.appendChild(tr);
    });
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  document.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type="checkbox"][data-id]');
    if (!cb) return;
    const id = cb.getAttribute('data-id');
    if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
  });

  document.getElementById('select-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('#results-table tbody input[type="checkbox"][data-id]').forEach(cb => {
      cb.checked = checked;
      const id = cb.getAttribute('data-id');
      if (checked) selectedIds.add(id); else selectedIds.delete(id);
    });
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    if (action === 'view') {
      const id = btn.getAttribute('data-id');
      try {
        const res = await fetch(`${backendUrl}/results/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const m = document.getElementById('result-modal');
        const body = document.getElementById('result-modal-body');
        const title = document.getElementById('result-modal-title');
        if (m && body && title) {
          title.textContent = `Result: ${data.result?.quizId?.title || ''}`;
          body.innerHTML = `<pre style="white-space:pre-wrap">${JSON.stringify(data.result, null, 2)}</pre>`;
          m.style.display = 'block';
        }
      } catch(_) { alert('Failed to load result'); }
    }
  });

  document.getElementById('result-modal-close')?.addEventListener('click', () => {
    const m = document.getElementById('result-modal');
    if (m) m.style.display = 'none';
  });

  releaseBtn?.addEventListener('click', async () => {
    if (selectedIds.size === 0) { alert('Select at least one pending result.'); return; }
    try {
      const res = await fetch(`${backendUrl}/results/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ resultIds: Array.from(selectedIds) })
      });
      const data = await res.json();
      alert(data.message || (res.ok ? 'Results released' : 'Failed'));
      if (releaseSendNotify?.checked) {
        try {
          const msgTmpl = releaseMessageInput?.value || 'Your quiz results have been released';
          // Optional: send notification using backend notifications endpoint if present
          // await fetch(`${backendUrl}/notifications/release`, { ... })
        } catch(_) {}
      }
      fetchResults(currentPage);
    } catch(_) { alert('Failed to release'); }
  });

  quizFilter?.addEventListener('change', () => fetchResults(1));
  prevBtn?.addEventListener('click', () => { if (currentPage > 1) fetchResults(currentPage - 1); });
  nextBtn?.addEventListener('click', () => { if (currentPage < totalPages) fetchResults(currentPage + 1); });

  fetchQuizzesForFilter().then(() => fetchResults(1));
});

