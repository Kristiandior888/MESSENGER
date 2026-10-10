// js/handlers/groups/group-context-menu.js
import { getChatDisplayName, isGroupChat } from '../../utils/chatUtils.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { updateChatsList } from './index.js';
import { showGroupInfo } from './group-info.js';
import { leaveGroup, clearChatHistory } from './group-actions.js';

/**
 * Показать контекстное меню для чата
 */
export function showChatContextMenu(e, chat) {
    e.preventDefault();
    e.stopPropagation();

    const existingMenu = document.querySelector('.chat-context-menu');
    if (existingMenu) existingMenu.remove();

    const menu = createMenuElement();

    menu.appendChild(createNotificationsItem(chat));
    menu.appendChild(createPinItem(chat));
    menu.appendChild(createSeparator());

    if (isGroupChat(chat)) {
        menu.appendChild(createGroupInfoItem(chat));
        menu.appendChild(createLeaveGroupItem(chat));
    } else {
        menu.appendChild(createClearHistoryItem(chat));
    }

    positionAndAttachMenu(menu, e);
}

function createMenuItem(text, onClick, isDanger = false) {
    const item = document.createElement('div');
    item.className = 'context-menu-item' + (isDanger ? ' danger' : '');
    item.innerHTML = `<span>${escapeHtml(text)}</span>`;
    item.addEventListener('click', onClick);
    return item;
}

function createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    return separator;
}

function createNotificationsItem(chat) {
    const isMuted = chat.notifications === false;
    const text = isMuted ? '🔔 Включить уведомления' : '🔕 Выключить уведомления';

    return createMenuItem(text, () => {
        chat.notifications = !isMuted;
        console.log(`Уведомления для ${chat.name}: ${chat.notifications}`);
    });
}

function createPinItem(chat) {
    const text = chat.pinned ? '📌 Открепить чат' : '📌 Закрепить чат';

    return createMenuItem(text, () => {
        chat.pinned = !chat.pinned;
        updateChatsList();
    });
}

function createGroupInfoItem(chat) {
    return createMenuItem('ℹ Информация о группе', () => {
        showGroupInfo(chat.id);
    });
}

function createLeaveGroupItem(chat) {
    const displayName = getChatDisplayName(chat);

    return createMenuItem('Выйти из группы', async () => {
        if (confirm(`Выйти из группы "${displayName}"?`)) {
            await leaveGroup(chat.id);
        }
    }, true);
}

function createClearHistoryItem(chat) {
    const displayName = getChatDisplayName(chat);

    return createMenuItem('Очистить историю', () => {
        if (confirm(`Очистить историю чата с ${displayName}?`)) {
            clearChatHistory(chat.id);
        }
    }, true);
}

function createMenuElement() {
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    return menu;
}

function positionAndAttachMenu(menu, event) {
    document.body.appendChild(menu);

    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';

    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 100);
}