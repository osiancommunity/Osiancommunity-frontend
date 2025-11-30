document.addEventListener('DOMContentLoaded', function () {
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : 'https://your-backend-url.onrender.com/api';
    const token = localStorage.getItem('token');
    const adminTableBody = document.getElementById('admin-list-body');
    const searchInput = document.getElementById('user-search');

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

    let allAdmins = [];

    const fetchAdmins = async () => {
        try {
            const response = await fetch(`${backendUrl}/users/admins`, { // Assuming an endpoint to get only admins
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                }
                throw new Error('Failed to fetch admins');
            }

            allAdmins = await response.json();
            renderAdmins(allAdmins);
        } catch (error) {
            console.error('Error fetching admins:', error);
            adminTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Error loading admins. Please try again later.</td></tr>`;
        }
    };

    const renderAdmins = (admins) => {
        adminTableBody.innerHTML = '';
        if (admins.length === 0) {
            adminTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No admin accounts found.</td></tr>`;
            return;
        }

        admins.forEach(admin => {
            const adminRow = document.createElement('tr');
            adminRow.innerHTML = `
                <td>${admin.fullname}</td>
                <td>${admin.email}</td>
                <td>${admin.quizzesCreated || 0}</td>
                <td>${new Date(admin.createdAt).toLocaleDateString()}</td>
                <td><span class="role-tag ${admin.role}">${admin.role}</span></td>
                <td>
                    <button class="btn-edit change-role-btn" data-userid="${admin._id}" data-username="${admin.fullname}">Manage Role</button>
                </td>
            `;
            adminTableBody.appendChild(adminRow);
        });
    };

    const filterAndSearchAdmins = () => {
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredAdmins = allAdmins.filter(admin =>
            admin.fullname.toLowerCase().includes(searchTerm) ||
            admin.email.toLowerCase().includes(searchTerm)
        );

        renderAdmins(filteredAdmins);
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
            const response = await fetch(`${backendUrl}/users/${currentUserId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!response.ok) {
                throw new Error('Failed to update role');
            }

            await fetchAdmins();
            closeRoleModal();

        } catch (error) {
            console.error('Error updating role:', error);
            alert('Could not update user role. Please try again.');
        }
    };

    // Event Listeners
    searchInput.addEventListener('input', filterAndSearchAdmins);

    adminTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('change-role-btn')) {
            const userId = e.target.dataset.userid;
            const userName = e.target.dataset.username;
            openRoleModal(userId, userName);
        }
    });

    modalCancelBtn.addEventListener('click', closeRoleModal);
    modalSaveBtn.addEventListener('click', saveRoleChange);

    // Initial fetch
    fetchAdmins();
});
