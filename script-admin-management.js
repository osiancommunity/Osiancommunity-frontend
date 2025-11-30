document.addEventListener('DOMContentLoaded', () => {
  const backendUrl = (location.hostname.endsWith('vercel.app'))
    ? 'https://osiancommunity-backend.vercel.app/api'
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://osiancommunity-backend.vercel.app/api');

  const token = localStorage.getItem('token');
  let user = null;
  try { user = JSON.parse(localStorage.getItem('user')); } catch(_) { user = null; }
  if (!token || !user || (user.role || '').toLowerCase() !== 'superadmin') {
    alert('Access Denied');
    window.location.href = 'login.html';
    return;
  }

  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) { logoutBtn.style.display = 'none'; }

  const tbody = document.getElementById('admin-list-body');
  const searchInput = document.getElementById('user-search');

  let admins = [];
  let filtered = [];

  async function fetchAdmins() {
    try {
      const res = await fetch(`${backendUrl}/users/admins`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      admins = (Array.isArray(data) ? data : (data.users || [])).map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: (u.role || 'admin'),
        joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '--',
        quizzesCreated: (u.quizzesCreated || 0)
      }));
      filtered = [...admins];
      render();
    } catch(e) {
      tbody.innerHTML = '<tr><td colspan="6">Failed to load admins.</td></tr>';
    }
  }

  function render() {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No admins found.</td></tr>';
      return;
    }
    filtered.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.quizzesCreated}</td>
        <td>${u.joined}</td>
        <td><span class="role-tag ${u.role === 'superadmin' ? 'superadmin' : 'admin'}">${u.role}</span></td>
        <td>
          <button class="btn-edit" data-action="role" data-id="${u.id}" data-name="${u.name}" data-role="${u.role}">Change Role</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function applyFilters() {
    const q = (searchInput?.value || '').toLowerCase();
    filtered = admins.filter(u => (q ? (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : true));
    render();
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (action === 'role' && id) {
      const name = btn.getAttribute('data-name') || 'Admin';
      const select = document.getElementById('modal-role-select');
      const modalName = document.getElementById('modal-user-name');
      const modal = document.getElementById('change-role-modal');
      if (modalName) modalName.textContent = name;
      if (select) select.value = btn.getAttribute('data-role') || 'admin';
      if (modal) modal.style.display = 'block';
      const save = document.getElementById('modal-save-btn');
      const cancel = document.getElementById('modal-cancel-btn');
      const onSave = async () => {
        const newRole = select.value;
        try {
          const res = await fetch(`${backendUrl}/users/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: id, newRole })
          });
          const data = await res.json();
          alert(data.message || (res.ok ? 'Role updated' : 'Failed'));
          modal.style.display = 'none';
          fetchAdmins();
        } catch(err) {
          alert('Failed to update role');
        }
        save.removeEventListener('click', onSave);
        cancel.removeEventListener('click', onCancel);
      };
      const onCancel = () => { modal.style.display = 'none'; save.removeEventListener('click', onSave); cancel.removeEventListener('click', onCancel); };
      save.addEventListener('click', onSave);
      cancel.addEventListener('click', onCancel);
    }
  });

  searchInput?.addEventListener('input', applyFilters);
  fetchAdmins();
});

