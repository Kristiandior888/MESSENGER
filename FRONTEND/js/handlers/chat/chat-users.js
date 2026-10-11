// js/handlers/chat/chat-users.js
import { state } from '../../app.js';
import { initGrpc } from './grpc-init.js';

const userNamesCache = new Map();
const userEmailsCache = new Map();

/**
 * Загружает всех пользователей с сервера и заполняет кэши.
 * Возвращает массив пользователей.
 */
export async function loadAllUsersFromServer() {
    try {
        const { service } = await initGrpc();

        if (typeof service.getUsers !== 'function') {
            console.warn('Метод getUsers не реализован на сервере');
            return [];
        }

        const response = await service.getUsers('');

        if (response.error) {
            console.error('Ошибка загрузки пользователей:', response.error);
            return [];
        }

        const allUsersFromServer = response.users || [];

        userNamesCache.clear();
        userEmailsCache.clear();

        allUsersFromServer.forEach(user => {
            const userName = user.name || user.email?.split('@')[0] ||
                (user.id === state.currentUser?.id ? 'Вы' : 'Пользователь');
            userNamesCache.set(user.id, userName);
            userEmailsCache.set(user.id, user.email);
        });

        if (state.currentUser && !userNamesCache.has(state.currentUser.id)) {
            userNamesCache.set(state.currentUser.id, 'Вы');
            userEmailsCache.set(state.currentUser.id, state.currentUser.email);
        }

        console.log(`📋 Загружено ${allUsersFromServer.length} пользователей в кэш`);

        return allUsersFromServer;

    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
        return [];
    }
}

/**
 * Обёртка над loadAllUsersFromServer — оставлена для совместимости.
 */
export async function loadAllUsersMap() {
    return loadAllUsersFromServer();
}

/**
 * Получить одного пользователя с сервера (или из кэша).
 */
export async function fetchAndCacheUserData(userId) {
    if (!userId) return null;

    if (userNamesCache.has(userId) && userEmailsCache.has(userId)) {
        return {
            name: userNamesCache.get(userId),
            email: userEmailsCache.get(userId),
        };
    }

    try {
        const { service } = await initGrpc();
        const response = await service.getUser(userId);

        if (response && response.user) {
            const name = response.user.name || response.user.email?.split('@')[0] || null;
            userNamesCache.set(userId, name);
            userEmailsCache.set(userId, response.user.email);
            return {
                name: name,
                email: response.user.email,
            };
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки пользователя ${userId}:`, error);
    }

    return null;
}

/**
 * Получить всех пользователей из кэша (кроме себя).
 * Используется в updateChatsList для отображения «пользователей без чатов».
 */
export function getAllUsersFromCache() {
    const users = [];
    for (const [id, name] of userNamesCache) {
        if (id === state.currentUser?.id) continue;
        users.push({
            id,
            name,
            email: userEmailsCache.get(id),
        });
    }
    return users;
}

/**
 * Получить имя пользователя из кэша (синхронно).
 */
export function getCachedUserName(userId) {
    return userNamesCache.get(userId) || null;
}

/**
 * Получить email пользователя из кэша (синхронно).
 */
export function getCachedUserEmail(userId) {
    return userEmailsCache.get(userId) || null;
}

/**
 * Обновить имена всех чатов в state, затем перерисовать список.
 */
export async function refreshAllChatNames() {
    await loadAllUsersFromServer();

    for (const chat of state.chats) {
        if (chat.type === 'GROUP' || chat.type === 1) continue;

        if (chat.other_user_id && userNamesCache.has(chat.other_user_id)) {
            chat.other_user_name = userNamesCache.get(chat.other_user_id);
            chat.other_user_email = userEmailsCache.get(chat.other_user_id);
        }
    }

    const { updateChatsList } = await import('../groups/index.js');
    await updateChatsList();

    if (state.currentChat) {
        const { updateChatAreaUI } = await import('./chat-ui.js');
        await updateChatAreaUI();
    }
}

// Псевдоним для совместимости со старым API
export const fetchAndCacheUserName = fetchAndCacheUserData;