// js/handlers/chat/chat-ui.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { 
    setCurrentChat, 
    getCurrentChat, 
    getChatDisplayName, 
    isGroupChat,
    createRealChatWithUser,
    refreshChatsList,
    fetchAndCacheUserName,
    loadAllUsersMap
} from './chat-core.js';
import { loadMessagesFromServer } from './chat-messages.js';
import { showChatContextMenu } from '../groups/index.js';

function escapeHtml(str) {
    if (!str) return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export async function updateChatAreaUI() {
    console.log('Полное обновление UI чата, currentChat:', state.currentChat);
    
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.querySelector('.message-input');
    const chatArea = document.querySelector('.chat-area');
    const chatName = document.getElementById('chat-name');
    const chatStatus = document.getElementById('chat-status');
    const chatHeaderAvatar = document.querySelector('.chat-avatar-placeholder span');
    
    if (!messagesDiv || !messageInput || !chatArea) return;
    
    const oldPlaceholder = document.getElementById('chat-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    
    if (getCurrentChat()) {
        messagesDiv.style.display = 'flex';
        messageInput.style.display = 'flex';
        
        const currentChatObj = state.chats?.find(c => c.id === state.currentChat);
        if (currentChatObj) {
            const displayName = getChatDisplayName(currentChatObj);
            if (chatName) chatName.textContent = displayName;
            if (chatHeaderAvatar) {
                chatHeaderAvatar.textContent = isGroupChat(currentChatObj) ? '👥' : '💬';
            }
            if (chatStatus) {
                if (isGroupChat(currentChatObj)) {
                    const participantsCount = currentChatObj.participants?.length || 0;
                    chatStatus.textContent = `${participantsCount} участников`;
                } else {
                    chatStatus.textContent = '';
                }
            }
        }
        
        await loadMessagesFromServer(getCurrentChat());
    } else {
        messagesDiv.style.display = 'none';
        messageInput.style.display = 'none';
        
        if (chatName) chatName.textContent = 'Выберите чат';
        if (chatStatus) chatStatus.textContent = '';
        if (chatHeaderAvatar) chatHeaderAvatar.textContent = '💬';
        
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

export async function updateChatAreaUIOnly() {
    console.log('Обновление UI чата (без загрузки сообщений), currentChat:', state.currentChat);
    
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.querySelector('.message-input');
    const chatArea = document.querySelector('.chat-area');
    const chatName = document.getElementById('chat-name');
    const chatStatus = document.getElementById('chat-status');
    const chatHeaderAvatar = document.querySelector('.chat-avatar-placeholder span');
    
    if (!messagesDiv || !messageInput || !chatArea) return;
    
    const oldPlaceholder = document.getElementById('chat-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    
    if (getCurrentChat()) {
        messagesDiv.style.display = 'flex';
        messageInput.style.display = 'flex';
        
        const currentChatObj = state.chats?.find(c => c.id === state.currentChat);
        if (currentChatObj) {
            const displayName = getChatDisplayName(currentChatObj);
            if (chatName) chatName.textContent = displayName;
            if (chatHeaderAvatar) {
                chatHeaderAvatar.textContent = isGroupChat(currentChatObj) ? '👥' : '💬';
            }
            if (chatStatus) {
                if (isGroupChat(currentChatObj)) {
                    const participantsCount = currentChatObj.participants?.length || 0;
                    chatStatus.textContent = `${participantsCount} участников`;
                } else {
                    chatStatus.textContent = '';
                }
            }
        }
    } else {
        messagesDiv.style.display = 'none';
        messageInput.style.display = 'none';
        
        if (chatName) chatName.textContent = 'Выберите чат';
        if (chatStatus) chatStatus.textContent = '';
        if (chatHeaderAvatar) chatHeaderAvatar.textContent = '💬';
        
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

export function createChatItemElement(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chat.id;
    
    let displayName = getChatDisplayName(chat);
    const isGroup = isGroupChat(chat);
    const typeIcon = isGroup ? '👥 ' : '💬 ';
    const pinIcon = chat.pinned ? '📌 ' : '';
    const unreadBadge = chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : '';
    
    // Для пустых чатов показываем индикатор "Нет сообщений"
    const hasMessages = chat.last_message !== null && chat.last_message !== undefined;
    const emptyIndicator = !hasMessages && !isGroup ? '<span style="font-size: 0.7rem; opacity: 0.5; margin-left: 5px;"></span>' : '';
    
    chatItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${typeIcon}</span>
                <span class="chat-name-span">${pinIcon}${escapeHtml(displayName)}${emptyIndicator}</span>
            </div>
            ${unreadBadge}
        </div>
    `;

    chatItem.addEventListener('click', async () => {
        document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
        chatItem.classList.add('active');
        await setCurrentChat(chat.id);
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