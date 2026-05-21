// admin/renderer.js
const adminService = require('./grpc-service.js');

let users = [];
let currentTab = 'active';
let currentFilter = 'all';
let searchQuery = '';
let isAuthenticated = false;
let pendingEmail = '';
let isRequesting = false;
let isVerifying = false;

const adminContent = document.getElementById('admin-content');
const authFullscreen = document.getElementById('auth-fullscreen');
const usersTableBody = document.getElementById('users-table-body');
const activeUsersSpan = document.getElementById('active-users');
const adminCountSpan = document.getElementById('admin-count');
const deletedCountSpan = document.getElementById('deleted-count');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const createUserBtn = document.getElementById('create-user-btn');
const exportUsersBtn = document.getElementById('export-users-btn');
const serverStatusSpan = document.querySelector('#server-status .status-dot');
const serverStatusText = document.querySelector('#server-status span:last-child');
const logoutBtn = document.getElementById('logout-btn');

const createModal = document.getElementById('create-modal');
const editModal = document.getElementById('edit-modal');
const deleteModal = document.getElementById('delete-modal');
const restoreModal = document.getElementById('restore-modal');

let currentEditUserId = null;
let currentDeleteUser = null;
let currentRestoreUser = null;

function showAdminContent() {
    if (adminContent) adminContent.style.display = 'block';
    if (authFullscreen) authFullscreen.style.display = 'none';
}

function showAuthScreen() {
    if (adminContent) adminContent.style.display = 'none';
    if (authFullscreen) authFullscreen.style.display = 'flex';
}

function logout() {
    isAuthenticated = false;
    adminService.setAuthToken(null);
    pendingEmail = '';
    showAuthScreen();
    const authEmail = document.getElementById('auth-email');
    const authCode = document.getElementById('auth-code');
    if (authEmail) authEmail.value = '';
    if (authCode) authCode.value = '';
    const stepEmail = document.getElementById('auth-step-email');
    const stepCode = document.getElementById('auth-step-code');
    if (stepEmail) stepEmail.style.display = 'block';
    if (stepCode) stepCode.style.display = 'none';
}

async function handleRequestCode() {
    if (isRequesting) return;
    
    const emailInput = document.getElementById('auth-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const errorDiv = document.getElementById('auth-error');
    
    if (!email) {
        if (errorDiv) {
            errorDiv.textContent = 'Введите email';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (errorDiv) {
            errorDiv.textContent = 'Введите корректный email';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    isRequesting = true;
    const requestBtn = document.getElementById('auth-request-code');
    if (requestBtn) {
        requestBtn.disabled = true;
        requestBtn.textContent = 'Отправка...';
    }
    if (errorDiv) errorDiv.style.display = 'none';
    
    try {
        const response = await adminService.requestEmailCode(email);
        
        if (response.success) {
            pendingEmail = email;
            adminService.setPendingEmail(email);
            const emailDisplay = document.getElementById('auth-email-display');
            if (emailDisplay) emailDisplay.textContent = email;
            const stepEmail = document.getElementById('auth-step-email');
            const stepCode = document.getElementById('auth-step-code');
            if (stepEmail) stepEmail.style.display = 'none';
            if (stepCode) stepCode.style.display = 'block';
            const codeInput = document.getElementById('auth-code');
            if (codeInput) codeInput.value = '';
        } else {
            if (errorDiv) {
                errorDiv.textContent = response.error || 'Не удалось отправить код';
                errorDiv.style.display = 'block';
            }
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Ошибка подключения к серверу';
            errorDiv.style.display = 'block';
        }
    } finally {
        isRequesting = false;
        if (requestBtn) {
            requestBtn.disabled = false;
            requestBtn.textContent = 'Получить код';
        }
    }
}

async function handleVerifyCode() {
    if (isVerifying) return;
    
    const codeInput = document.getElementById('auth-code');
    const code = codeInput ? codeInput.value.trim() : '';
    const errorDiv = document.getElementById('auth-code-error');
    const email = pendingEmail || adminService.getPendingEmail();
    
    if (!email) {
        if (errorDiv) {
            errorDiv.textContent = 'Email не найден. Попробуйте начать заново.';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (!code || code.length < 4) {
        if (errorDiv) {
            errorDiv.textContent = 'Введите код из письма';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    isVerifying = true;
    const verifyBtn = document.getElementById('auth-verify-code');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Проверка...';
    }
    if (errorDiv) errorDiv.style.display = 'none';
    
    try {
        const response = await adminService.verifyEmailCode(email, code);
        
        if (response.success && response.token) {
            isAuthenticated = true;
            showAdminContent();
            await loadUsers();
            showToast('Добро пожаловать в админ-панель!', 'success');
            const stepCode = document.getElementById('auth-step-code');
            const stepEmail = document.getElementById('auth-step-email');
            if (stepCode) stepCode.style.display = 'none';
            if (stepEmail) stepEmail.style.display = 'block';
            const authEmail = document.getElementById('auth-email');
            const authCode = document.getElementById('auth-code');
            if (authEmail) authEmail.value = '';
            if (authCode) authCode.value = '';
        } else {
            if (errorDiv) {
                if (response.error && response.error.includes('Admins only')) {
                    errorDiv.textContent = 'У вашей учетной записи нет прав администратора.';
                } else {
                    errorDiv.textContent = response.error || 'Неверный код подтверждения';
                }
                errorDiv.style.display = 'block';
            }
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Ошибка подключения к серверу';
            errorDiv.style.display = 'block';
        }
    } finally {
        isVerifying = false;
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Войти';
        }
    }
}

function backToEmail() {
    const stepCode = document.getElementById('auth-step-code');
    const stepEmail = document.getElementById('auth-step-email');
    const codeInput = document.getElementById('auth-code');
    const errorDiv = document.getElementById('auth-code-error');
    if (stepCode) stepCode.style.display = 'none';
    if (stepEmail) stepEmail.style.display = 'block';
    if (codeInput) codeInput.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
}

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️');
    toast.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

function formatLastSeen(timestamp) {
    if (!timestamp || timestamp === 0) return '—';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return 'сегодня в ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return 'вчера';
    } else if (days < 7) {
        return days + ' дн. назад';
    } else {
        return date.toLocaleDateString('ru-RU');
    }
}

function getStatusBadge(user) {
    if (user.is_deleted) return '<span class="status-badge deleted">В корзине</span>';
    if (user.is_blocked) return '<span class="status-badge blocked">Заблокирован</span>';
    return '<span class="status-badge active">Активен</span>';
}

function getRoleBadge(role) {
    if (role === 'super-admin' || role === 'admin') {
        return '<span class="role-badge admin">Администратор</span>';
    }
    return '<span class="role-badge user">Пользователь</span>';
}

function updateStats() {
    const activeUsers = users.filter(function(u) { return !u.is_deleted && !u.is_blocked; });
    const adminCount = activeUsers.filter(function(u) { return u.role === 'super-admin' || u.role === 'admin'; }).length;
    const deletedCount = users.filter(function(u) { return u.is_deleted === true; }).length;
    
    if (activeUsersSpan) activeUsersSpan.textContent = activeUsers.length;
    if (adminCountSpan) adminCountSpan.textContent = adminCount;
    if (deletedCountSpan) deletedCountSpan.textContent = deletedCount;
}

function getFilteredUsers() {
    let filtered = users.slice();
    
    if (currentTab === 'active') {
        filtered = filtered.filter(function(u) { return !u.is_deleted && !u.is_blocked; });
    } else if (currentTab === 'deleted') {
        filtered = filtered.filter(function(u) { return u.is_deleted === true; });
    }
    
    if (currentFilter !== 'all') {
        if (currentFilter === 'admin') {
            filtered = filtered.filter(function(u) { return u.role === 'super-admin' || u.role === 'admin'; });
        } else if (currentFilter === 'user') {
            filtered = filtered.filter(function(u) { return u.role !== 'super-admin' && u.role !== 'admin'; });
        }
    }
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(function(u) {
            return (u.name && u.name.toLowerCase().includes(query)) ||
                   (u.email && u.email.toLowerCase().includes(query));
        });
    }
    
    return filtered;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderUsers() {
    if (!isAuthenticated) return;
    
    const filteredUsers = getFilteredUsers();
    
    if (filteredUsers.length === 0) {
        if (usersTableBody) {
            usersTableBody.innerHTML = '<tr class="loading-row"><td colspan="7"><span>👀 Пользователи не найдены</span></td></tr>';
        }
        updateStats();
        return;
    }
    
    let html = '';
    for (let i = 0; i < filteredUsers.length; i++) {
        const user = filteredUsers[i];
        const isDeleted = user.is_deleted === true;
        
        html += '<tr data-user-id="' + escapeHtml(user.id) + '">';
        html += '<td><div class="user-avatar">' + (user.avatar_url ? '<img src="' + escapeHtml(user.avatar_url) + '" style="width:36px;height:36px;border-radius:50%">' : '👤') + '</div></td>';
        html += '<td><strong>' + escapeHtml(user.name || user.email.split('@')[0]) + '</strong></td>';
        html += '<td>' + escapeHtml(user.email) + '</td>';
        html += '<td>' + getRoleBadge(user.role) + '</td>';
        html += '<td>' + getStatusBadge(user) + '</td>';
        html += '<td>' + formatLastSeen(user.last_seen) + '</td>';
        html += '<td><div class="action-buttons">';
        
        if (!isDeleted) {
            html += '<button class="action-btn edit" data-user-id="' + escapeHtml(user.id) + '" data-user-email="' + escapeHtml(user.email) + '" data-user-name="' + escapeHtml(user.name || '') + '">✏️</button>';
            html += '<button class="action-btn delete" data-user-id="' + escapeHtml(user.id) + '" data-user-name="' + escapeHtml(user.name || user.email) + '">🗑️</button>';
        } else {
            // Для удаленных пользователей только кнопка восстановления, без кнопки удаления
            html += '<button class="action-btn restore" data-user-id="' + escapeHtml(user.id) + '" data-user-name="' + escapeHtml(user.name || user.email) + '">🔄 Восстановить</button>';
        }
        
        html += '</div></td></tr>';
    }
    
    if (usersTableBody) usersTableBody.innerHTML = html;
    
    // Обработчики для редактирования
    document.querySelectorAll('.action-btn.edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentEditUserId = btn.dataset.userId;
            const editEmail = document.getElementById('edit-email');
            const editName = document.getElementById('edit-name');
            if (editEmail) editEmail.value = btn.dataset.userEmail;
            if (editName) editName.value = btn.dataset.userName;
            if (editModal) editModal.style.display = 'flex';
        });
    });
    
    // Обработчики для восстановления
    document.querySelectorAll('.action-btn.restore').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentRestoreUser = { id: btn.dataset.userId, name: btn.dataset.userName };
            const restoreName = document.getElementById('restore-user-name');
            if (restoreName) restoreName.textContent = btn.dataset.userName;
            if (restoreModal) restoreModal.style.display = 'flex';
        });
    });
    
    // Обработчики для удаления (только для активных пользователей)
    document.querySelectorAll('.action-btn.delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentDeleteUser = { 
                id: btn.dataset.userId, 
                name: btn.dataset.userName,
                isDeleted: false
            };
            const deleteName = document.getElementById('delete-user-name');
            if (deleteName) deleteName.textContent = btn.dataset.userName;
            if (deleteModal) deleteModal.style.display = 'flex';
        });
    });
    
    updateStats();
}

async function loadUsers() {
    if (!isAuthenticated) return;
    
    if (usersTableBody) {
        usersTableBody.innerHTML = '<tr class="loading-row"><td colspan="7"><div class="loader"></div><span>Загрузка пользователей...</span></td></tr>';
    }
    
    try {
        const response = await adminService.getAllUsers();
        users = response.users || [];
        renderUsers();
        updateServerStatus(true);
    } catch (error) {
        if (usersTableBody) {
            usersTableBody.innerHTML = '<tr class="loading-row"><td colspan="7"><span style="color:#e05a5a;">❌ ' + error.message + '</span></td></tr>';
        }
        updateServerStatus(false);
        
        if (error.message.includes('авторизация') || error.message.includes('Unauthenticated')) {
            isAuthenticated = false;
            showAuthScreen();
        }
    }
}

function updateServerStatus(online) {
    if (online) {
        if (serverStatusSpan) serverStatusSpan.className = 'status-dot online';
        if (serverStatusText) serverStatusText.textContent = 'Сервер: онлайн';
    } else {
        if (serverStatusSpan) serverStatusSpan.className = 'status-dot offline';
        if (serverStatusText) serverStatusText.textContent = 'Сервер: офлайн';
    }
}

async function createUser() {
    const emailInput = document.getElementById('user-email');
    const nameInput = document.getElementById('user-name');
    const email = emailInput ? emailInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    
    if (!email || !name) {
        showToast('Заполните все поля', 'warning');
        return;
    }
    
    const submitBtn = document.querySelector('#create-modal .create-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Создание...';
    }
    
    try {
        const response = await adminService.createUser(email, name);
        if (response.success) {
            showToast('Пользователь создан', 'success');
            if (createModal) createModal.style.display = 'none';
            if (emailInput) emailInput.value = '';
            if (nameInput) nameInput.value = '';
            await loadUsers();
        } else {
            showToast(response.error || 'Ошибка создания', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Создать';
        }
    }
}

async function editUser() {
    const emailInput = document.getElementById('edit-email');
    const nameInput = document.getElementById('edit-name');
    const email = emailInput ? emailInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    
    if (!email || !name) {
        showToast('Заполните все поля', 'warning');
        return;
    }
    
    const submitBtn = document.querySelector('#edit-modal .edit-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';
    }
    
    try {
        const response = await adminService.editUser(currentEditUserId, email, name);
        if (response.success) {
            showToast('Пользователь обновлён', 'success');
            if (editModal) editModal.style.display = 'none';
            await loadUsers();
        } else {
            showToast(response.error || 'Ошибка обновления', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Сохранить';
        }
    }
}

async function deleteUser() {
    if (!currentDeleteUser) return;
    
    const confirmBtn = document.querySelector('#delete-modal .delete-confirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Удаление...';
    }
    
    try {
        const response = await adminService.deleteUser(currentDeleteUser.id);
        if (response.success) {
            showToast('Пользователь "' + currentDeleteUser.name + '" перемещен в корзину', 'success');
            if (deleteModal) deleteModal.style.display = 'none';
            await loadUsers();
        } else {
            showToast(response.error || 'Ошибка удаления', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Удалить';
        }
    }
}

async function restoreUser() {
    if (!currentRestoreUser) return;
    
    const confirmBtn = document.querySelector('#restore-modal .restore-confirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Восстановление...';
    }
    
    try {
        // Пробуем восстановить через editUser, снимая флаг is_deleted
        // Если API не поддерживает, пробуем другие методы
        let response;
        try {
            // Пытаемся восстановить через editUser
            response = await adminService.editUser(currentRestoreUser.id, null, null);
        } catch (editError) {
            // Если editUser не работает, пробуем другие подходы
            console.log('editUser не сработал, пробуем другие методы');
            response = { success: false, error: 'Метод восстановления не поддерживается сервером' };
        }
        
        if (response.success) {
            showToast('Пользователь "' + currentRestoreUser.name + '" восстановлен', 'success');
            if (restoreModal) restoreModal.style.display = 'none';
            await loadUsers();
        } else {
            showToast(response.error || 'Ошибка восстановления. Возможно, сервер не поддерживает восстановление.', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Восстановить';
        }
    }
}

function exportUsers() {
    const filteredUsers = getFilteredUsers();
    const headers = ['ID', 'Имя', 'Email', 'Роль', 'Статус', 'Последний визит'];
    const rows = [headers];
    
    for (let i = 0; i < filteredUsers.length; i++) {
        const user = filteredUsers[i];
        rows.push([
            user.id,
            user.name || '',
            user.email,
            (user.role === 'super-admin' || user.role === 'admin') ? 'Администратор' : 'Пользователь',
            user.is_deleted ? 'В корзине' : (user.is_blocked ? 'Заблокирован' : 'Активен'),
            formatLastSeen(user.last_seen)
        ]);
    }
    
    const csvRows = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const escapedRow = [];
        for (let j = 0; j < row.length; j++) {
            escapedRow.push('"' + String(row[j]).replace(/"/g, '""') + '"');
        }
        csvRows.push(escapedRow.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'users_' + currentTab + '_' + new Date().toISOString().slice(0, 19) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Экспортировано ' + filteredUsers.length + ' пользователей', 'success');
}

function closeModals() {
    if (createModal) createModal.style.display = 'none';
    if (editModal) editModal.style.display = 'none';
    if (deleteModal) deleteModal.style.display = 'none';
    if (restoreModal) restoreModal.style.display = 'none';
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        tab.addEventListener('click', function() {
            for (let j = 0; j < tabs.length; j++) {
                tabs[j].classList.remove('active');
            }
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            renderUsers();
        });
    }
}

function setupFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        filter.addEventListener('click', function() {
            for (let j = 0; j < filters.length; j++) {
                filters[j].classList.remove('active');
            }
            filter.classList.add('active');
            currentFilter = filter.dataset.filter;
            renderUsers();
        });
    }
}

async function init() {
    console.log('Админ-панель запущена');
    
    setupTabs();
    setupFilters();
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchQuery = e.target.value;
            renderUsers();
        });
    }
    
    if (refreshBtn) refreshBtn.addEventListener('click', loadUsers);
    if (createUserBtn) createUserBtn.addEventListener('click', function() { if (createModal) createModal.style.display = 'flex'; });
    if (exportUsersBtn) exportUsersBtn.addEventListener('click', exportUsers);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    const closeButtons = document.querySelectorAll('.modal-close, .cancel-btn');
    for (let i = 0; i < closeButtons.length; i++) {
        closeButtons[i].addEventListener('click', closeModals);
    }
    
    const modals = document.querySelectorAll('.modal');
    for (let i = 0; i < modals.length; i++) {
        modals[i].addEventListener('click', function(e) { if (e.target === modals[i]) closeModals(); });
    }
    
    const createSubmit = document.querySelector('#create-modal .create-submit');
    if (createSubmit) createSubmit.addEventListener('click', createUser);
    
    const editSubmit = document.querySelector('#edit-modal .edit-submit');
    if (editSubmit) editSubmit.addEventListener('click', editUser);
    
    const deleteConfirm = document.querySelector('#delete-modal .delete-confirm');
    if (deleteConfirm) deleteConfirm.addEventListener('click', deleteUser);
    
    const restoreConfirm = document.querySelector('#restore-modal .restore-confirm');
    if (restoreConfirm) restoreConfirm.addEventListener('click', restoreUser);
    
    const requestBtn = document.getElementById('auth-request-code');
    if (requestBtn) requestBtn.addEventListener('click', handleRequestCode);
    
    const verifyBtn = document.getElementById('auth-verify-code');
    if (verifyBtn) verifyBtn.addEventListener('click', handleVerifyCode);
    
    const backBtn = document.getElementById('auth-back-email');
    if (backBtn) backBtn.addEventListener('click', backToEmail);
    
    const authEmail = document.getElementById('auth-email');
    if (authEmail) {
        authEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleRequestCode();
        });
    }
    
    const authCode = document.getElementById('auth-code');
    if (authCode) {
        authCode.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleVerifyCode();
        });
    }
    
    showAuthScreen();
}

init();