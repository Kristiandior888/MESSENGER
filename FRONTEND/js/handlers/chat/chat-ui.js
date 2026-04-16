// js/handlers/chat/chat-ui.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { setCurrentChat, getCurrentChat, getChatDisplayName, isGroupChat } from './chat-core.js';
import { loadMessagesFromServer } from './chat-messages.js';
import { showChatContextMenu } from '../groupHandlers.js';

/**
 * Экранирование HTML
 */
function escapeHtml(str) {
    if (!str) return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Обновление UI в зависимости от выбранного чата (полное, с загрузкой сообщений)
 */
export async function updateChatAreaUI() {
    console.log('🔄 Полное обновление UI чата, currentChat:', state.currentChat);
    
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.querySelector('.message-input');
    const chatArea = document.querySelector('.chat-area');
    
    if (!messagesDiv || !messageInput || !chatArea) return;
    
    const oldPlaceholder = document.getElementById('chat-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    
    if (getCurrentChat()) {
        messagesDiv.style.display = 'flex';
        messageInput.style.display = 'flex';
        
        await loadMessagesFromServer(getCurrentChat());
    } else {
        messagesDiv.style.display = 'none';
        messageInput.style.display = 'none';
        
        const placeholder = document.createElement('div');
        placeholder.id = 'chat-placeholder';
        placeholder.className = 'chat-placeholder';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-icon">💬</div>
                <h3>Выберите чат для общения</h3>
                <p>Нажмите на чат в списке слева, чтобы начать переписку</p>
            </div>
        `;
        
        chatArea.insertBefore(placeholder, messagesDiv);
    }
}

/**
 * Обновление UI чата БЕЗ загрузки сообщений (только отображение)
 */
export async function updateChatAreaUIOnly() {
    console.log('🔄 Обновление UI чата (без загрузки сообщений), currentChat:', state.currentChat);
    
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.querySelector('.message-input');
    const chatArea = document.querySelector('.chat-area');
    
    if (!messagesDiv || !messageInput || !chatArea) return;
    
    const oldPlaceholder = document.getElementById('chat-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    
    if (getCurrentChat()) {
        messagesDiv.style.display = 'flex';
        messageInput.style.display = 'flex';
        // НЕ вызываем loadMessagesFromServer здесь!
    } else {
        messagesDiv.style.display = 'none';
        messageInput.style.display = 'none';
        
        const placeholder = document.createElement('div');
        placeholder.id = 'chat-placeholder';
        placeholder.className = 'chat-placeholder';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-icon">💬</div>
                <h3>Выберите чат для общения</h3>
                <p>Нажмите на чат в списке слева, чтобы начать переписку</p>
            </div>
        `;
        
        chatArea.insertBefore(placeholder, messagesDiv);
    }
}

/**
 * Создание элемента чата
 */
export function createChatItemElement(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chat.id;
    
    const displayName = getChatDisplayName(chat);
    const pinIcon = chat.pinned ? '📌 ' : '';
    const unreadBadge = chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : '';
    
    // Иконка в зависимости от типа чата
    const isGroup = isGroupChat(chat);
    const typeIcon = isGroup ? '👥 ' : '💬 ';
    
    chatItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${typeIcon}</span>
                <span>${pinIcon}${escapeHtml(displayName)}</span>
            </div>
            ${unreadBadge}
        </div>
    `;

    chatItem.addEventListener('click', () => {
        document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
        chatItem.classList.add('active');
        setCurrentChat(chat.id);
    });

    chatItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showChatContextMenu(e, chat);
    });

    return chatItem;
}

export function setupAvatar() {
    const chatAvatar = document.getElementById('chat-avatar');
    if (chatAvatar) {
        if (state.userAvatar) {
            chatAvatar.src = state.userAvatar;
        } else {
            const savedAvatar = localStorage.getItem('userAvatar');
            if (savedAvatar) {
                state.userAvatar = savedAvatar;
                chatAvatar.src = savedAvatar;
            }
        }
    }

    const avatarWrapper = document.getElementById('avatar-wrapper');
    if (avatarWrapper) {
        // Удаляем старые обработчики
        const newAvatarWrapper = avatarWrapper.cloneNode(true);
        avatarWrapper.parentNode.replaceChild(newAvatarWrapper, avatarWrapper);
        
        newAvatarWrapper.addEventListener('click', () => {
            showScreen('profile');
        });
    }
}

export function showErrorMessage(message) {
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