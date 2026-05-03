// admin/renderer.js
const adminService = require('./grpc-service.js');

let users = [];
let currentFilter = 'all';
let searchQuery = '';
let isAuthenticated = false;
let pendingEmail = '';

// DOM элементы
const usersTableBody = document.getElementById('users-table-body');
const totalUsersSpan = document.getElementById('total-users');
const adminCountSpan = document.getElementById('admin-count');
const activeCountSpan = document.getElementById('active-count');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const createUserBtn = document.getElementById('create-user-btn');
const exportUsersBtn = document.getElementById('export-users-btn');
const serverStatusSpan = document.querySelector('#server-status .status-dot');
const serverStatusText = document.querySelector('#server-status span:last-child');

// Модальные окна
const createModal = document.getElementById('create-modal');
const editModal = document.getElementById('edit-modal');
const deleteModal = document.getElementById('delete-modal');
const authEmailModal = document.getElementById('auth-email-modal');
const authCodeModal = document.getElementById('auth-code-modal');

let currentEditUserId = null;
let currentDeleteUser = null;
let isRequesting = false;
let isVerifying = false;

// Показать модальное окно ввода email
function showAuthEmailModal() {
    if (authEmailModal) {
        authEmailModal.style.display = 'flex';
        document.getElementById('login-email').value = '';
        document.getElementById('login-error').style.display = 'none';
    }
}

// Показать модальное окно ввода кода
function showAuthCodeModal(email) {
    if (authCodeModal) {
        document.getElementById('confirm-email').textContent = email;
        document.getElementById('verify-code').value = '';
        document.getElementById('code-error').style.display = 'none';
        authEmailModal.style.display = 'none';
        authCodeModal.style.display = 'flex';
    }
}

// Скрыть модальные окна авторизации
function hideAuthModals() {
    if (authEmailModal) authEmailModal.style.display = 'none';
    if (authCodeModal) authCodeModal.style.display = 'none';
}

// Запрос кода на email
async function handleRequestCode() {
    if (isRequesting) return;
    
    const email = document.getElementById('login-email').value.trim();
    const errorDiv = document.getElementById('login-error');
    
    if (!email) {
        errorDiv.textContent = 'Введите email';
        errorDiv.style.display = 'block';
        return;
    }
    
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorDiv.textContent = 'Введите корректный email';
        errorDiv.style.display = 'block';
        return;
    }
    
    isRequesting = true;
    const requestBtn = document.getElementById('request-code-btn');
    requestBtn.disabled = true;
    requestBtn.textContent = 'Отправка...';
    errorDiv.style.display = 'none';
    
    try {
        const response = await adminService.requestEmailCode(email);
        
        if (response.success) {
            pendingEmail = email;
            adminService.setPendingEmail(email);
            showAuthCodeModal(email);
        } else {
            errorDiv.textContent = response.error || 'Не удалось отправить код';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        errorDiv.textContent = error.message || 'Ошибка подключения к серверу';
        errorDiv.style.display = 'block';
    } finally {
        isRequesting = false;
        requestBtn.disabled = false;
        requestBtn.textContent = 'Получить код';
    }
}

// Проверка кода и вход
async function handleVerifyCode() {
    if (isVerifying) return;
    
    const code = document.getElementById('verify-code').value.trim();
    const errorDiv = document.getElementById('code-error');
    const email = pendingEmail || adminService.getPendingEmail();
    
    if (!email) {
        errorDiv.textContent = 'Email не найден. Попробуйте начать заново.';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!code || code.length < 4) {
        errorDiv.textContent = 'Введите код из письма';
        errorDiv.style.display = 'block';
        return;
    }
    
    isVerifying = true;
    const verifyBtn = document.getElementById('verify-code-btn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Проверка...';
    errorDiv.style.display = 'none';
    
    try {
        const response = await adminService.verifyEmailCode(email, code);
        
        if (response.success && response.token) {
            console.log('✅ Авторизация успешна');
            isAuthenticated = true;
            hideAuthModals();
            await loadUsers();
            showToast(`Добро пожаловать, ${response.user?.name || email}!`, 'success');
        } else {
            errorDiv.textContent = response.error || 'Неверный код подтверждения';
            errorDiv.style.display = 'block';
            document.getElementById('verify-code').value = '';
            document.getElementById('verify-code').focus();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        errorDiv.textContent = error.message || 'Ошибка подключения к серверу';
        errorDiv.style.display = 'block';
    } finally {
        isVerifying = false;
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Войти';
    }
}

// Назад к вводу email
function backToEmail() {
    authCodeModal.style.display = 'none';
    showAuthEmailModal();
}

// Функция для отображения уведомлений
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Форматирование даты
function formatLastSeen(timestamp) {
    if (!timestamp || timestamp === 0) return '—';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return `сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
        return 'вчера';
    } else if (days < 7) {
        return `${days} дн. назад`;
    } else {
        return date.toLocaleDateString('ru-RU');
    }
}

function getStatusBadge(user) {
    if (user.is_deleted) return '<span class="status-badge deleted">Удалён</span>';
    if (user.is_blocked) return '<span class="status-badge blocked">Заблокирован</span>';
    return '<span class="status-badge active">Активен</span>';
}

function getRoleBadge(role) {
    const roleName = role === 'admin' ? 'Администратор' : 'Пользователь';
    return `<span class="role-badge ${role === 'admin' ? 'admin' : 'user'}">${roleName}</span>`;
}

function updateStats() {
    const filteredUsers = getFilteredUsers();
    const adminCount = filteredUsers.filter(u => u.role === 'admin').length;
    const activeCount = filteredUsers.filter(u => !u.is_deleted && !u.is_blocked).length;
    
    totalUsersSpan.textContent = filteredUsers.length;
    adminCountSpan.textContent = adminCount;
    activeCountSpan.textContent = activeCount;
}

function getFilteredUsers() {
    let filtered = [...users];
    
    if (currentFilter !== 'all') {
        if (currentFilter === 'admin') {
            filtered = filtered.filter(u => u.role === 'admin');
        } else if (currentFilter === 'user') {
            filtered = filtered.filter(u => u.role !== 'admin');
        } else if (currentFilter === 'active') {
            filtered = filtered.filter(u => !u.is_deleted && !u.is_blocked);
        } else if (currentFilter === 'blocked') {
            filtered = filtered.filter(u => u.is_blocked && !u.is_deleted);
        }
    }
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(u => 
            (u.name && u.name.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query))
        );
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
        usersTableBody.innerHTML = `<tr class="loading-row"><td colspan="7"><span>👀 Пользователи не найдены</span></td></tr>`;
        updateStats();
        return;
    }
    
    usersTableBody.innerHTML = filteredUsers.map(user => `
        <tr data-user-id="${escapeHtml(user.id)}">
            <td><div class="user-avatar">${user.avatar_url ? `<img src="${escapeHtml(user.avatar_url)}" style="width:36px;height:36px;border-radius:50%">` : '👤'}</div></td>
            <td><strong>${escapeHtml(user.name || user.email.split('@')[0])}</strong></td>
            <td>${escapeHtml(user.email)}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${getStatusBadge(user)}</td>
            <td>${formatLastSeen(user.last_seen)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" data-user-id="${escapeHtml(user.id)}" data-user-email="${escapeHtml(user.email)}" data-user-name="${escapeHtml(user.name || '')}" data-user-role="${escapeHtml(user.role || 'user')}">✏️</button>
                    <button class="action-btn delete" data-user-id="${escapeHtml(user.id)}" data-user-name="${escapeHtml(user.name || user.email)}">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            currentEditUserId = btn.dataset.userId;
            document.getElementById('edit-email').value = btn.dataset.userEmail;
            document.getElementById('edit-name').value = btn.dataset.userName;
            document.getElementById('edit-role').value = btn.dataset.userRole;
            editModal.style.display = 'flex';
        });
    });
    
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => {
            currentDeleteUser = { id: btn.dataset.userId, name: btn.dataset.userName };
            document.getElementById('delete-user-name').textContent = btn.dataset.userName;
            deleteModal.style.display = 'flex';
        });
    });
    
    updateStats();
}

async function loadUsers() {
    if (!isAuthenticated) return;
    
    usersTableBody.innerHTML = `<tr class="loading-row"><td colspan="7"><div class="loader"></div><span>Загрузка пользователей...</span></td></tr>`;
    
    try {
        const response = await adminService.getAllUsers();
        users = response.users || [];
        renderUsers();
        updateServerStatus(true);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        usersTableBody.innerHTML = `<tr class="loading-row"><td colspan="7"><span style="color:#e05a5a;">❌ ${error.message}</span></td></tr>`;
        updateServerStatus(false);
        
        if (error.message.includes('авторизация')) {
            isAuthenticated = false;
            showAuthEmailModal();
        }
    }
}

function updateServerStatus(online) {
    if (online) {
        serverStatusSpan.className = 'status-dot online';
        serverStatusText.textContent = 'Сервер: онлайн';
    } else {
        serverStatusSpan.className = 'status-dot offline';
        serverStatusText.textContent = 'Сервер: офлайн';
    }
}

async function createUser() {
    const email = document.getElementById('user-email').value.trim();
    const name = document.getElementById('user-name').value.trim();
    
    if (!email || !name) {
        showToast('Заполните все поля', 'warning');
        return;
    }
    
    const submitBtn = document.querySelector('#create-modal .create-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Создание...';
    
    try {
        const response = await adminService.createUser(email, name);
        if (response.success) {
            showToast('Пользователь создан', 'success');
            createModal.style.display = 'none';
            document.getElementById('user-email').value = '';
            document.getElementById('user-name').value = '';
            await loadUsers();
        } else {
            showToast(response.error || 'Ошибка создания', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Создать';
    }
}

async function editUser() {
    const email = document.getElementById('edit-email').value.trim();
    const name = document.getElementById('edit-name').value.trim();
    
    if (!email || !name) {
        showToast('Заполните все поля', 'warning');
        return;
    }
    
    const submitBtn = document.querySelector('#edit-modal .edit-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Сохранение...';
    
    try {
        const response = await adminService.editUser(currentEditUserId, email, name);
        if (response.success) {
            showToast('Пользователь обновлён', 'success');
            editModal.style.display = 'none';
            await loadUsers();
        } else {
            showToast(response.error || 'Ошибка обновления', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить';
    }
}

async function deleteUser() {
    if (!currentDeleteUser) return;
    
    const confirmBtn = document.querySelector('#delete-modal .delete-confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Удаление...';
    
    try {
        const response = await adminService.deleteUser(currentDeleteUser.id);
        if (response.success) {
            showToast(`Пользователь "${currentDeleteUser.name}" удалён`, 'success');
            deleteModal.style.display = 'none';
            await loadUsers();
        } else {
            showToast(response.error || 'Ошибка удаления', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Удалить';
    }
}

function exportUsers() {
    const filteredUsers = getFilteredUsers();
    const headers = ['ID', 'Имя', 'Email', 'Роль', 'Статус', 'Последний визит'];
    const rows = filteredUsers.map(user => [
        user.id, user.name || '', user.email,
        user.role === 'admin' ? 'Администратор' : 'Пользователь',
        user.is_deleted ? 'Удалён' : (user.is_blocked ? 'Заблокирован' : 'Активен'),
        formatLastSeen(user.last_seen)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `users_${new Date().toISOString().slice(0, 19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Экспортировано ${filteredUsers.length} пользователей`, 'success');
}

function closeModals() {
    createModal.style.display = 'none';
    editModal.style.display = 'none';
    deleteModal.style.display = 'none';
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderUsers();
        });
    });
}

async function init() {
    console.log('🚀 Админ-панель запущена');
    
    setupFilters();
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderUsers();
    });
    
    refreshBtn.addEventListener('click', loadUsers);
    createUserBtn.addEventListener('click', () => createModal.style.display = 'flex');
    exportUsersBtn.addEventListener('click', exportUsers);
    
    document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModals(); });
    });
    
    document.querySelector('#create-modal .create-submit')?.addEventListener('click', createUser);
    document.querySelector('#edit-modal .edit-submit')?.addEventListener('click', editUser);
    document.querySelector('#delete-modal .delete-confirm')?.addEventListener('click', deleteUser);
    
    // Кнопки авторизации
    document.getElementById('request-code-btn')?.addEventListener('click', handleRequestCode);
    document.getElementById('verify-code-btn')?.addEventListener('click', handleVerifyCode);
    document.getElementById('back-to-email')?.addEventListener('click', backToEmail);
    document.getElementById('code-modal-close')?.addEventListener('click', () => {
        authCodeModal.style.display = 'none';
        showAuthEmailModal();
    });
    
    // Закрытие модального окна email при клике вне
    if (authEmailModal) {
        authEmailModal.addEventListener('click', (e) => {
            if (e.target === authEmailModal) authEmailModal.style.display = 'none';
        });
    }
    
    if (authCodeModal) {
        authCodeModal.addEventListener('click', (e) => {
            if (e.target === authCodeModal) {
                authCodeModal.style.display = 'none';
                showAuthEmailModal();
            }
        });
    }
    
    // Enter в поле email
    document.getElementById('login-email')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRequestCode();
    });
    
    // Enter в поле кода
    document.getElementById('verify-code')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleVerifyCode();
    });
    
    // Показываем окно входа
    showAuthEmailModal();
}

init();