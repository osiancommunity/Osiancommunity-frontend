document.addEventListener('DOMContentLoaded', function () {
    function showToast(message, type){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast ' + (type || '');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
    }
const backendUrl = (location.hostname.endsWith('vercel.app'))
  ? 'https://osiancommunity-backend.vercel.app/api'
  : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://osiancommunity-backend.vercel.app/api');
    const token = localStorage.getItem('token');
    const userTableBody = document.getElementById('user-list-body');
    const searchInput = document.getElementById('user-search');
    const roleFilter = document.getElementById('role-filter');

    // Modal elements
    const modal = document.getElementById('change-role-modal');
    const modalUserName = document.getElementById('modal-user-name');
    const modalRoleSelect = document.getElementById('modal-role-select');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    let currentUserId = null;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let allUsers = [];

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${backendUrl}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                }
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            allUsers = data.users || [];
            renderUsers(allUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            userTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Error loading users. Please try again later.</td></tr>`;
        }
    };

    const renderUsers = (users) => {
        userTableBody.innerHTML = '';
        if (users.length === 0) {
            userTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No users found.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const userRow = document.createElement('tr');
            userRow.innerHTML = `
                <td>${user.name || user.fullname || ''}</td>
                <td>${user.email || ''}</td>
                <td><span class="role-tag ${user.role}">${user.role}</span></td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</td>
                <td><span class="status-tag ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'active' : 'inactive'}</span></td>
                <td>
                    <button class="btn-edit change-role-btn" data-userid="${user._id}" data-username="${user.name || user.fullname || ''}">Change Role</button>
                    <button class="btn-${user.isActive ? 'delete' : 'create'} toggle-status-btn" data-userid="${user._id}" data-status="${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            userTableBody.appendChild(userRow);
        });
    };

    const filterAndSearchUsers = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const role = roleFilter.value;

        let filteredUsers = allUsers;

        if (role !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.role === role);
        }

        if (searchTerm) {
            filteredUsers = filteredUsers.filter(user =>
                user.fullname.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm)
            );
        }

        renderUsers(filteredUsers);
    };

    const openRoleModal = (userId, userName) => {
        currentUserId = userId;
        modalUserName.textContent = userName;
        modal.style.display = 'flex';
    };

    const closeRoleModal = () => {
        modal.style.display = 'none';
        currentUserId = null;
    };

    const saveRoleChange = async () => {
        const newRole = modalRoleSelect.value;
        if (!currentUserId || !newRole) return;

        try {
            const response = await fetch(`${backendUrl}/users/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: currentUserId, newRole })
            });

            if (!response.ok) {
                throw new Error('Failed to update role');
            }

            // Refresh user list
            await fetchUsers();
            closeRoleModal();

        } catch (error) {
            console.error('Error updating role:', error);
            showToast('Could not update user role. Please try again.', 'error');
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const response = await fetch(`${backendUrl}/users/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: userId, isActive: newStatus === 'active' })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            await fetchUsers();

        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Could not update user status. Please try again.', 'error');
        }
    };

    // Event Listeners
    searchInput.addEventListener('input', filterAndSearchUsers);
    roleFilter.addEventListener('change', filterAndSearchUsers);

    userTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('change-role-btn')) {
            const userId = e.target.dataset.userid;
            const userName = e.target.dataset.username;
            openRoleModal(userId, userName);
        }
        if (e.target.classList.contains('toggle-status-btn')) {
            const userId = e.target.dataset.userid;
            const status = e.target.dataset.status;
            function showToastConfirm(message, onConfirm){
                let el = document.getElementById('osian-toast');
                if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
                el.className = 'osian-toast warning';
                el.innerHTML = `${message} <span class="actions"><button id="toast-confirm">Confirm</button> <button id="toast-cancel">Cancel</button></span>`;
                el.classList.add('show');
                const confirmBtn = document.getElementById('toast-confirm');
                const cancelBtn = document.getElementById('toast-cancel');
                const hide = ()=>{ el.classList.remove('show'); el.innerHTML=''; };
                if (confirmBtn) confirmBtn.onclick = function(){ hide(); if (onConfirm) onConfirm(); };
                if (cancelBtn) cancelBtn.onclick = function(){ hide(); };
            }
            showToastConfirm(`Are you sure you want to ${status === 'active' ? 'deactivate' : 'activate'} this user?`, function(){
                toggleUserStatus(userId, status);
            });
        }
    });

    modalCancelBtn.addEventListener('click', closeRoleModal);
    modalSaveBtn.addEventListener('click', saveRoleChange);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeRoleModal();
        }
    });

    // Initial fetch
    fetchUsers();
});
