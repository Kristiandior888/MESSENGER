// js/handlers/chat/chat-users-list.js
import { state } from '../../app.js';
import { createRealChatWithUser } from './chat-core.js';
import { loadMessagesFromServer } from './chat-messages.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { showErrorMessage } from './chat-ui.js';

/**
 * Создание элемента пользователя для списка
 */
export function createUserListItem(user) {
    const userItem = document.createElement('div');
    userItem.className = 'chat-item';
    userItem.dataset.userId = user.id;
    userItem.dataset.isVirtual = 'true';

    const displayName = user.name || user.email?.split('@')[0] || 'Пользователь';
    const displayEmail = user.email || '';

    userItem.innerHTML = `
        <div class="user-list-row">
            <div class="user-list-avatar">👤</div>
            <div class="user-list-info">
                <div class="user-list-name">${escapeHtml(displayName)}</div>
                <div class="user-list-email">${escapeHtml(displayEmail)}</div>
            </div>
            <span class="chat-type-icon">💬</span>
        </div>
    `;

    userItem.addEventListener('click', async () => {
    await openChatWithUser(user);
    });

    userItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showUserContextMenu(e, user);
    });

    return userItem;
}

/**
 * Открыть (или создать) чат с пользователем и переключиться на него.
 * Делает всё: создаёт чат, ставит currentChat, грузит сообщения, обновляет активный класс.
 */
async function openChatWithUser(user) {
    const chat = await getOrCreateChatWithUser(user);
    if (!chat) return null;

    state.currentChat = chat.id;

    // Снимаем active со всех чатов
    document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));

    // Ставим active на нужный элемент — ищем и по data-chat-id, и по data-user-id
    const targetItem = document.querySelector(
        `.chat-item[data-chat-id="${chat.id}"], .chat-item[data-user-id="${user.id}"]`
    );
    if (targetItem) targetItem.classList.add('active');

    await loadMessagesFromServer(chat.id);
    return chat;
}

/**
 * Получение или создание чата с пользователем
 */
async function getOrCreateChatWithUser(user) {
    let existingChat = state.chats.find(chat => {
        if (chat.type === 'GROUP' || chat.type === 1) return false;
        if (chat.other_user_id === user.id) return true;
        if (chat.participants && Array.isArray(chat.participants)) {
            return chat.participants.some(p => p.id === user.id);
        }
        return false;
    });

    if (existingChat) {
        console.log('✅ Чат уже существует:', existingChat.id);
        return existingChat;
    }

    try {
        const chat = await createRealChatWithUser(user.id, user.name, user.email);
        return chat;
    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        showErrorMessage('Не удалось создать чат с пользователем');
        return null;
    }
}

/**
 * Контекстное меню для пользователя
 */
function showUserContextMenu(e, user) {
    const existingMenu = document.querySelector('.chat-context-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    menu.style.position = 'fixed';
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';

    menu.innerHTML = `
        <div class="context-menu-item" data-action="start-chat">
            <span>💬 Начать чат</span>
        </div>
        <div class="context-menu-item" data-action="view-profile">
            <span>👤 Просмотр профиля</span>
        </div>
    `;

    document.body.appendChild(menu);

    const startChatItem = menu.querySelector('[data-action="start-chat"]');
    startChatItem.addEventListener('click', async () => {
        menu.remove();
        await openChatWithUser(user);
    });

    const profileItem = menu.querySelector('[data-action="view-profile"]');
    if (profileItem) {
        profileItem.addEventListener('click', () => {
            menu.remove();
            showUserProfileModal(user);
        });
    }

    setTimeout(() => {
        const closeMenu = (clickEvent) => {
            if (!menu.contains(clickEvent.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 100);
}

/**
 * Показать профиль пользователя
 */
function showUserProfileModal(user) {
    const existingModal = document.getElementById('user-profile-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'user-profile-modal';
    modal.className = 'modal-overlay';

    const displayName = user.name || user.email?.split('@')[0] || 'Пользователь';

    modal.innerHTML = `
        <div class="modal-container user-profile-modal-container">
            <div class="modal-header">
                <h3>Информация о пользователе</h3>
                <button class="modal-close close-user-profile">✕</button>
            </div>
            <div class="modal-body user-profile-modal-body">
                <div class="user-avatar-circle">👤</div>
                <div class="user-profile-info-row">
                    <label>Имя:</label>
                    <span>${escapeHtml(displayName)}</span>
                </div>
                <div class="user-profile-info-row">
                    <label>Email:</label>
                    <span>${escapeHtml(user.email || '')}</span>
                </div>
                <div class="user-profile-info-row">
                    <label>ID:</label>
                    <span>${escapeHtml(user.id?.slice(-8) || '')}</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary start-chat-from-profile">Написать сообщение</button>
                <button class="btn-secondary close-user-profile">Закрыть</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeButtons = modal.querySelectorAll('.close-user-profile');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const startChatBtn = modal.querySelector('.start-chat-from-profile');
    startChatBtn.addEventListener('click', async () => {
        modal.remove();
        await openChatWithUser(user);
    });
}
