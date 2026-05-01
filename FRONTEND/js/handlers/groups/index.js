// js/handlers/groups/index.js
// Экспорты всех функций для работы с группами

// Создание группы
export { showCreateGroupModal } from './create-group.js';

// Информация о группе
export { showGroupInfo } from './group-info.js';

// Контекстное меню
export { showChatContextMenu } from './group-context-menu.js';

// Действия с группами
export { leaveGroup, clearChatHistory, logout } from './group-actions.js';

// Обновление списка чатов (импортируем из group-actions или делаем здесь)
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
        chatsList.innerHTML = '<div class="no-chats" style="padding: 20px; text-align: center; color: #a0a8b4;">Нет доступных чатов</div>';
        return;
    }
    
    // Сортировка: закрепленные сверху, затем по алфавиту
    const sortedChats = [...state.chats].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });
    
    for (const chat of sortedChats) {
        const chatItem = createChatListItem(chat);
        chatsList.appendChild(chatItem);
    }
}

/**
 * Создание элемента чата для списка
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
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                <span class="chat-type-icon">${typeIcon}</span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pinIcon}${escapeHtml(displayName)}</span>
            </div>
            ${unreadBadge}
        </div>
    `;
    
    // Клик по чату
    chatItem.addEventListener('click', async () => {
        document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
        chatItem.classList.add('active');
        state.currentChat = chat.id;
        await loadMessagesFromServer(chat.id);
    });
    
    // Контекстное меню (правый клик)
    chatItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showChatContextMenu(e, chat);
    });
    
    return chatItem;
}