// js/handlers/chat/chat-ui.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { 
    setCurrentChat, 
    getCurrentChat, 
    getChatDisplayName, 
    isGroupChat, 
    isVirtualChat,
    createRealChatWithUser,
    refreshChatsList
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
    
    if (!messagesDiv || !messageInput || !chatArea) return;
    
    const oldPlaceholder = document.getElementById('chat-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    
    if (getCurrentChat()) {
        messagesDiv.style.display = 'flex';
        messageInput.style.display = 'flex';
        
        const currentChatObj = state.chats?.find(c => c.id === state.currentChat);
        
        if (currentChatObj?.isVirtual) {
            console.log('🎯 Виртуальный чат, создаем реальный...');
            
            messagesDiv.innerHTML = '<div class="no-messages">🔄 Создание чата...</div>';
            
            const realChat = await createRealChatWithUser(
                currentChatObj.realUserId, 
                currentChatObj.name
            );
            
            if (realChat && !realChat.isVirtual) {
                state.currentChat = realChat.id;
                await loadMessagesFromServer(realChat.id);
                
                // Обновляем элемент в списке чатов
                const chatItem = document.querySelector(`.chat-item[data-chat-id="${currentChatObj.id}"]`);
                if (chatItem) {
                    chatItem.dataset.chatId = realChat.id;
                    chatItem.dataset.isVirtual = 'false';
                    chatItem.style.opacity = '1';
                }
                
                await refreshChatsList();
            } else {
                messagesDiv.innerHTML = '<div class="no-messages">❌ Не удалось создать чат. Попробуйте позже.</div>';
            }
        } else {
            await loadMessagesFromServer(getCurrentChat());
        }
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

export async function updateChatAreaUIOnly() {
    console.log('Обновление UI чата (без загрузки сообщений), currentChat:', state.currentChat);
    
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.querySelector('.message-input');
    const chatArea = document.querySelector('.chat-area');
    
    if (!messagesDiv || !messageInput || !chatArea) return;
    
    const oldPlaceholder = document.getElementById('chat-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    
    if (getCurrentChat()) {
        messagesDiv.style.display = 'flex';
        messageInput.style.display = 'flex';
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

export function createChatItemElement(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chat.id;
    chatItem.dataset.isVirtual = chat.isVirtual ? 'true' : 'false';
    
    const displayName = getChatDisplayName(chat);
    const pinIcon = chat.pinned ? '📌 ' : '';
    const unreadBadge = chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : '';
    
    const isGroup = isGroupChat(chat);
    const isVirtual = isVirtualChat(chat);
    
    let typeIcon = '💬 ';
    if (isGroup) {
        typeIcon = '👥 ';
    } else if (isVirtual) {
        typeIcon = '👤 ';
    }
    
    if (isVirtual) {
        chatItem.style.opacity = '0.85';
    }
    
    chatItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${typeIcon}</span>
                <span>${pinIcon}${escapeHtml(displayName)}</span>
            </div>
            ${unreadBadge}
        </div>
    `;

    chatItem.addEventListener('click', async () => {
        document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
        chatItem.classList.add('active');
        
        if (chat.isVirtual) {
            console.log('🎯 Виртуальный чат, создаем реальный...');
            
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = '<div class="no-messages">🔄 Создание чата...</div>';
                messagesDiv.style.display = 'flex';
            }
            
            const realChat = await createRealChatWithUser(chat.realUserId, chat.name);
            
            if (realChat && !realChat.isVirtual) {
                state.currentChat = realChat.id;
                
                chatItem.dataset.chatId = realChat.id;
                chatItem.dataset.isVirtual = 'false';
                chatItem.style.opacity = '1';
                
                const nameSpan = chatItem.querySelector('span:last-child');
                if (nameSpan && realChat.name) {
                    nameSpan.innerHTML = nameSpan.innerHTML.replace(chat.name, realChat.name);
                }
                
                await loadMessagesFromServer(realChat.id);
            } else {
                if (messagesDiv) {
                    messagesDiv.innerHTML = '<div class="no-messages">❌ Не удалось создать чат. Попробуйте позже.</div>';
                }
            }
        } else {
            await setCurrentChat(chat.id);
        }
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