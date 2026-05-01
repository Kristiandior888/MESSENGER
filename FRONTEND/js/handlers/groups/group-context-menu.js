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
    
    // Удаляем существующее меню
    const existingMenu = document.querySelector('.chat-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = createMenuElement();
    
    // Добавляем пункты меню
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

/**
 * Создать элемент меню
 */
function createMenuItem(text, onClick, isDanger = false) {
    const item = document.createElement('div');
    item.className = 'context-menu-item';
    if (isDanger) {
        item.style.color = '#e05a5a';
    }
    item.innerHTML = `<span>${escapeHtml(text)}</span>`;
    item.addEventListener('click', onClick);
    return item;
}

/**
 * Создать разделитель
 */
function createSeparator() {
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = '#3a424c';
    separator.style.margin = '8px 0';
    return separator;
}

/**
 * Создать элемент меню для уведомлений
 */
function createNotificationsItem(chat) {
    const isMuted = chat.notifications === false;
    const text = isMuted ? '🔔 Включить уведомления' : '🔕 Выключить уведомления';
    
    return createMenuItem(text, () => {
        chat.notifications = !isMuted;
        console.log(`Уведомления для ${chat.name}: ${chat.notifications}`);
        // TODO: Сохранить настройку на сервере
    });
}

/**
 * Создать элемент меню для закрепления чата
 */
function createPinItem(chat) {
    const text = chat.pinned ? '📌 Открепить чат' : '📌 Закрепить чат';
    
    return createMenuItem(text, () => {
        chat.pinned = !chat.pinned;
        updateChatsList();
        // TODO: Сохранить настройку на сервере
    });
}

/**
 * Создать элемент меню для информации о группе
 */
function createGroupInfoItem(chat) {
    return createMenuItem('ℹИнформация о группе', () => {
        showGroupInfo(chat.id);
    });
}

/**
 * Создать элемент меню для выхода из группы
 */
function createLeaveGroupItem(chat) {
    const displayName = getChatDisplayName(chat);
    
    return createMenuItem('Выйти из группы', async () => {
        if (confirm(`Выйти из группы "${displayName}"?`)) {
            await leaveGroup(chat.id);
        }
    }, true);
}

/**
 * Создать элемент меню для очистки истории
 */
function createClearHistoryItem(chat) {
    const displayName = getChatDisplayName(chat);
    
    return createMenuItem('Очистить историю', () => {
        if (confirm(`Очистить историю чата с ${displayName}?`)) {
            clearChatHistory(chat.id);
        }
    }, true);
}

/**
 * Создать контейнер меню
 */
function createMenuElement() {
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    return menu;
}

/**
 * Позиционировать и прикрепить меню к DOM
 */
function positionAndAttachMenu(menu, event) {
    document.body.appendChild(menu);
    
    // Позиционирование
    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';
    
    // Закрытие при клике вне меню
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