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
    const chatsList = document.getElementById('chats-list')
        || document.querySelector('.chats-list');
    if (!chatsList) return;

    chatsList.innerHTML = '';

    // Загружаем необходимые модули
    const { createChatItemElement } = await import('../chat/chat-ui.js');
    const { createUserListItem } = await import('../chat/chat-users-list.js');
    const { getAllUsersFromCache } = await import('../chat/chat-users.js');

    // 1. Существующие чаты
    const sortedChats = [...(state.chats || [])].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    for (const chat of sortedChats) {
        const chatItem = createChatItemElement(chat);
        chatsList.appendChild(chatItem);
    }

    // 2. Пользователи без чатов
    const usersWithoutChats = getUsersWithoutChats(getAllUsersFromCache());

    for (const user of usersWithoutChats) {
        const userItem = createUserListItem(user);
        chatsList.appendChild(userItem);
    }

    // 3. Заглушка, если совсем ничего
    if (sortedChats.length === 0 && usersWithoutChats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats">Нет других пользователей в системе</div>';
        return;
    }

    // 4. Подсветка активного чата
    if (state.currentChat) {
        const activeChat = chatsList.querySelector(
            `.chat-item[data-chat-id="${state.currentChat}"], .chat-item[data-user-id="${state.currentChat}"]`
        );
        if (activeChat) {
            activeChat.classList.add('active');
        }
    }

    console.log(`✅ Список чатов обновлен: ${sortedChats.length} чатов, ${usersWithoutChats.length} пользователей без чатов`);
}

/**
 * Возвращает пользователей, с которыми ещё нет личного чата.
 * Группы не учитываются — только личные чаты.
 */
function getUsersWithoutChats(allUsers) {
    if (!state.currentUser || !allUsers || allUsers.length === 0) return [];

    // Собираем ID всех, с кем уже есть чат
    const existingUserIds = new Set();

    for (const chat of (state.chats || [])) {
        if (chat.type === 'GROUP' || chat.type === 1) continue;

        if (chat.other_user_id) {
            existingUserIds.add(chat.other_user_id);
        }

        if (Array.isArray(chat.participants)) {
            for (const p of chat.participants) {
                if (p.id !== state.currentUser.id) {
                    existingUserIds.add(p.id);
                }
            }
        }
    }

    // Фильтруем пользователей: убираем себя и тех, с кем уже есть чат
    return allUsers.filter(user =>
        user.id !== state.currentUser.id &&
        !existingUserIds.has(user.id)
    );
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