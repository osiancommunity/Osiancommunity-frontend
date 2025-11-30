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

  const tbody = document.getElementById('user-list-body');
  const searchInput = document.getElementById('user-search');
  const roleFilter = document.getElementById('role-filter');

  let users = [];
  let filtered = [];

  async function fetchUsers() {
    try {
      const res = await fetch(`${backendUrl}/users?page=1&limit=100`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      users = (data.users || []).map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: (u.role || 'user'),
        isActive: u.isActive !== false,
        joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '--'
      }));
      filtered = [...users];
      render();
    } catch(e) {
      tbody.innerHTML = '<tr><td colspan="6">Failed to load users.</td></tr>';
    }
  }

  function render() {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
      return;
    }
    filtered.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="role-tag ${u.role === 'admin' ? 'admin' : (u.role === 'superadmin' ? 'superadmin' : 'user')}">${u.role}</span></td>
        <td>${u.joined}</td>
        <td><span class="status-tag ${u.isActive ? 'active' : 'inactive'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-edit" data-action="role" data-id="${u.id}" data-name="${u.name}" data-role="${u.role}">Change Role</button>
          <button class="btn-edit" data-action="status" data-id="${u.id}" data-active="${u.isActive}">${u.isActive ? 'Deactivate' : 'Activate'}</button>
          <button class="btn-delete" data-action="delete" data-id="${u.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function applyFilters() {
    const q = (searchInput?.value || '').toLowerCase();
    const rf = roleFilter?.value || 'all';
    filtered = users.filter(u => (
      (q ? (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : true)
      && (rf === 'all' ? true : (u.role === rf))
    ));
    render();
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (!action || !id) return;

    if (action === 'role') {
      const name = btn.getAttribute('data-name') || 'User';
      const select = document.getElementById('modal-role-select');
      const modalName = document.getElementById('modal-user-name');
      const modal = document.getElementById('change-role-modal');
      if (modalName) modalName.textContent = name;
      if (select) select.value = btn.getAttribute('data-role') || 'user';
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
          fetchUsers();
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

    if (action === 'status') {
      const current = btn.getAttribute('data-active') === 'true';
      const next = !current;
      try {
        const res = await fetch(`${backendUrl}/users/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ userId: id, isActive: next })
        });
        const data = await res.json();
        alert(data.message || (res.ok ? 'Status updated' : 'Failed'));
        fetchUsers();
      } catch(err) {
        alert('Failed to update status');
      }
    }

    if (action === 'delete') {
      if (!confirm('Delete this user?')) return;
      try {
        const res = await fetch(`${backendUrl}/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        alert(data.message || (res.ok ? 'Deleted' : 'Failed'));
        fetchUsers();
      } catch(err) {
        alert('Failed to delete');
      }
    }
  });

  searchInput?.addEventListener('input', applyFilters);
  roleFilter?.addEventListener('change', applyFilters);

  fetchUsers();
});

