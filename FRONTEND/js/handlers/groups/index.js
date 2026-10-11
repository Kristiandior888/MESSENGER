// js/handlers/groups/index.js
// Экспорты всех функций для работы с группами

export { showCreateGroupModal } from './create-group.js';
export { showGroupInfo } from './group-info.js';
export { showChatContextMenu } from './group-context-menu.js';
export { leaveGroup, clearChatHistory, logout } from './group-actions.js';

// Обновление списка чатов
import { state } from '../../app.js';
import { getChatDisplayName, isGroupChat } from '../../utils/chatUtils.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { loadMessagesFromServer } from '../chat/chat-messages.js';
import { showChatContextMenu } from './group-context-menu.js';

/**
 * Обновление списка чатов в боковой панели
 */
export async function updateChatsList() {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;

    chatsList.innerHTML = '';

    if (!state.chats || state.chats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats">Нет доступных чатов</div>';
        return;
    }

    const sortedChats = [...state.chats].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    const { createChatItemElement } = await import('../chat/chat-ui.js');

    for (const chat of sortedChats) {
        const chatItem = createChatItemElement(chat);
        chatsList.appendChild(chatItem);
    }

    if (state.currentChat) {
        const activeChat = chatsList.querySelector(`.chat-item[data-chat-id="${state.currentChat}"]`);
        if (activeChat) {
            activeChat.classList.add('active');
        }
    }

    console.log('✅ Список чатов обновлен через updateChatsList');
}

/**
 * Создание элемента чата для списка (не используется, но оставлен на случай необходимости)
 */
function createChatListItem(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = `chat-item ${state.currentChat === chat.id ? 'active' : ''}`;
    chatItem.setAttribute('data-chat-id', chat.id);

    const displayName = getChatDisplayName(chat);
    const pinIcon = chat.pinned ? '📌 ' : '';
    const typeIcon = isGroupChat(chat) ? '👥 ' : '💬 ';
    const unreadBadge = chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : '';

    chatItem.innerHTML = `
        <div class="chat-item-row">
            <div class="chat-item-name">
                <span class="chat-type-icon">${typeIcon}</span>
                <span class="chat-name-span">${pinIcon}${escapeHtml(displayName)}</span>
            </div>
            ${unreadBadge}
        </div>
    `;

    chatItem.addEventListener('click', async () => {
        document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
        chatItem.classList.add('active');
        state.currentChat = chat.id;
        await loadMessagesFromServer(chat.id);
    });

    chatItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showChatContextMenu(e, chat);
    });

    return chatItem;
}