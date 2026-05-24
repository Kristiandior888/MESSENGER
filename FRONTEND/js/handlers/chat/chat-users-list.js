// js/handlers/chat/chat-users-list.js
import { state } from '../../app.js';
import { createRealChatWithUser, loadAllUsersFromServer, refreshChatsList } from './chat-core.js';
import { loadMessagesFromServer } from './chat-messages.js';
import { escapeHtml } from '../../utils/domUtils.js';

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
    
    // Простой аватар - только эмодзи, без загрузки изображений
    userItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #d4af37; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #1a1e24; font-size: 16px;">
                    👤
                </div>
                <div style="overflow: hidden; flex: 1;">
                    <div style="font-weight: 500; color: var(--text-primary, #e0e0e0);">${escapeHtml(displayName)}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted, #a0a8b4);">${escapeHtml(displayEmail)}</div>
                </div>
            </div>
            <span class="chat-type-icon" style="opacity: 0.5;">💬</span>
        </div>
    `;
    
    userItem.addEventListener('click', async () => {
        document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
        userItem.classList.add('active');
        
        const chat = await getOrCreateChatWithUser(user);
        if (chat) {
            state.currentChat = chat.id;
            await loadMessagesFromServer(chat.id);
        }
    });
    
    // Контекстное меню для пользователя
    userItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showUserContextMenu(e, user);
    });
    
    return userItem;
}

/**
 * Получение или создание чата с пользователем
 */
async function getOrCreateChatWithUser(user) {
    // Проверяем, существует ли уже чат с этим пользователем
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
    
    // Создаем новый чат
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
        const chat = await getOrCreateChatWithUser(user);
        if (chat) {
            state.currentChat = chat.id;
            await loadMessagesFromServer(chat.id);
            document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
            const userItem = document.querySelector(`.chat-item[data-user-id="${user.id}"]`);
            if (userItem) userItem.classList.add('active');
        }
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
        <div class="modal-container" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Информация о пользователе</h3>
                <button class="modal-close close-user-profile">✕</button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: #d4af37; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #1a1e24;">
                    👤
                </div>
                <div class="info-row" style="padding: 12px 0; border-bottom: 1px solid var(--border-color, #3a424c);">
                    <label>Имя:</label>
                    <span>${escapeHtml(displayName)}</span>
                </div>
                <div class="info-row" style="padding: 12px 0; border-bottom: 1px solid var(--border-color, #3a424c);">
                    <label>Email:</label>
                    <span>${escapeHtml(user.email || '')}</span>
                </div>
                <div class="info-row" style="padding: 12px 0;">
                    <label>ID:</label>
                    <span style="font-size: 0.8rem;">${escapeHtml(user.id?.slice(-8) || '')}</span>
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
        const chat = await getOrCreateChatWithUser(user);
        if (chat) {
            state.currentChat = chat.id;
            await loadMessagesFromServer(chat.id);
            document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
            const userItem = document.querySelector(`.chat-item[data-user-id="${user.id}"]`);
            if (userItem) userItem.classList.add('active');
        }
    });
}

function showErrorMessage(message) {
    let errorToast = document.querySelector('.error-toast');
    if (!errorToast) {
        errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        document.body.appendChild(errorToast);
    }
    errorToast.textContent = message;
    errorToast.style.display = 'block';
    setTimeout(() => {
        errorToast.style.display = 'none';
    }, 3000);
}