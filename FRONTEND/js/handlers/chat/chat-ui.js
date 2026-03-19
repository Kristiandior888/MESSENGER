// js/handlers/chat/chat-ui.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { setCurrentChat, getCurrentChat } from './chat-core.js';
import { loadMessagesFromServer } from './chat-messages.js';
import { showChatContextMenu } from '../groupHandlers.js';

/**
 * Обновление UI в зависимости от выбранного чата
 */
export async function updateChatAreaUI() {
    console.log('🔄 Обновление UI чата, currentChat:', state.currentChat);
    
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.querySelector('.message-input');
    const chatArea = document.querySelector('.chat-area');
    
    if (!messagesDiv || !messageInput || !chatArea) return;
    
    const oldPlaceholder = document.getElementById('chat-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    
    if (getCurrentChat()) {
        messagesDiv.style.display = 'flex';
        messageInput.style.display = 'flex';
        
        const { loadMessagesFromServer } = await import('./chat-messages.js');
        loadMessagesFromServer(getCurrentChat());
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
 * Создание элемента чата - ТОЛЬКО НАЗВАНИЕ
 */
export function createChatItemElement(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chat.id;
    
    // Только название чата - без аватаров, без иконок, без последних сообщений
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-item-name';
    nameSpan.textContent = chat.name || `Чат ${chat.id}`;
    
    chatItem.appendChild(nameSpan);

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

/**
 * Настройка аватара пользователя
 */
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
        avatarWrapper.addEventListener('click', () => {
            showScreen('profile');
        });
    }
}

/**
 * Показ сообщения об ошибке
 */
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