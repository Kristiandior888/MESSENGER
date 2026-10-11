// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { updateChatAreaUI } from './chat-ui.js';
import { loadMessagesFromServer, stopAllMessageStreams } from './chat-messages.js';
import { showErrorMessage } from './chat-ui.js';

let grpcService;
let currentChatId = null;
let allUsers = [];

const userNamesCache = new Map();
const userEmailsCache = new Map();

export async function setCurrentChat(chatId) {
    console.log(`Установка текущего чата: ${chatId}`);

    state.currentChat = chatId;
    currentChatId = chatId;
    await updateChatAreaUI();
}

export function getCurrentChat() {
    return state.currentChat || currentChatId;
}

export async function initGrpc() {
    if (!grpcService) {
        const serviceModule = await import('../../grpc/grpc-service.js');
        grpcService = serviceModule.default || serviceModule;
    }
    return { service: grpcService };
}

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

        allUsers = allUsersFromServer;

        console.log(`📋 Загружено ${allUsersFromServer.length} пользователей в кэш`);

        return allUsersFromServer;

    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
        return [];
    }
}

export async function loadAllUsersMap() {
    return loadAllUsersFromServer();
}

export async function fetchAndCacheUserData(userId) {
    if (!userId) return null;

    if (userNamesCache.has(userId) && userEmailsCache.has(userId)) {
        return {
            name: userNamesCache.get(userId),
            email: userEmailsCache.get(userId)
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
                email: response.user.email
            };
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки пользователя ${userId}:`, error);
    }

    return null;
}

export async function loadChatsFromServer() {
    const { service } = await initGrpc();
    console.log('👤 Текущий пользователь:', state.currentUser);

    try {
        await loadAllUsersFromServer();

        const response = await service.getChats();

        console.log('📦 Получены чаты от сервера:', response.chats);

        const processedChats = [];

        for (const chat of (response.chats || [])) {
            const isGroup = (chat.type === 'GROUP' || chat.type === 1);

            if (!isGroup) {
                let otherUserId = null;
                let otherUserName = null;
                let otherUserEmail = null;

                if (chat.participants && Array.isArray(chat.participants)) {
                    const otherParticipant = chat.participants.find(p => p.id !== state.currentUser?.id);
                    if (otherParticipant) {
                        otherUserId = otherParticipant.id;
                        otherUserName = otherParticipant.name || otherParticipant.email?.split('@')[0];
                        otherUserEmail = otherParticipant.email;
                    }
                }

                if (!otherUserId && chat.last_message && chat.last_message.sender_id) {
                    const senderId = chat.last_message.sender_id;
                    if (senderId !== state.currentUser?.id) {
                        otherUserId = senderId;
                        const cachedName = userNamesCache.get(senderId);
                        const cachedEmail = userEmailsCache.get(senderId);
                        if (cachedName) otherUserName = cachedName;
                        if (cachedEmail) otherUserEmail = cachedEmail;
                    }
                }

                if (!otherUserId && chat.id && state.currentUser) {
                    const parts = chat.id.split('_');
                    for (const part of parts) {
                        if (part !== state.currentUser.id && part.length > 5 && userNamesCache.has(part)) {
                            otherUserId = part;
                            otherUserName = userNamesCache.get(part);
                            otherUserEmail = userEmailsCache.get(part);
                            break;
                        }
                    }
                }

                if (otherUserId) chat.other_user_id = otherUserId;
                if (otherUserName) chat.other_user_name = otherUserName;
                if (otherUserEmail) chat.other_user_email = otherUserEmail;

                console.log(`📝 Чат ${chat.id}: собеседник ID=${otherUserId}, имя=${otherUserName}, email=${otherUserEmail}`);
            }

            processedChats.push(chat);
        }

        state.chats = processedChats;

        await refreshChatsList();

        return state.chats;

    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        showErrorMessage('Не удалось загрузить список чатов');

        await loadAllUsersFromServer();
        await refreshChatsList();

        return [];
    }
}

export async function createRealChatWithUser(userId, userName, userEmail) {
    try {
        const { service } = await initGrpc();

        console.log('🔨 Создание чата с пользователем:', { userId, userName, userEmail });

        const existingChat = state.chats.find(chat => {
            if (chat.type === 'GROUP' || chat.type === 1) return false;
            if (chat.other_user_id === userId) return true;
            if (chat.participants) {
                return chat.participants.some(p => p.id === userId);
            }
            return false;
        });

        if (existingChat) {
            console.log('✅ Чат уже существует:', existingChat);
            return existingChat;
        }

        const response = await service.createChat(0, '', [userId]);

        console.log('📨 Ответ сервера:', response);

        if (response && response.chat) {
            const newChat = response.chat;
            newChat.other_user_id = userId;
            newChat.other_user_name = userName;
            newChat.other_user_email = userEmail;

            state.chats.unshift(newChat);
            await refreshChatsList();

            return newChat;
        }

        throw new Error(response?.error || 'Не удалось создать чат');

    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        throw error;
    }
}

export async function refreshChatsList() {
    const chatsList = document.querySelector('.chats-list');
    if (!chatsList) return;

    chatsList.innerHTML = '';

    const allUsersList = Array.from(userNamesCache.keys())
        .filter(id => id !== state.currentUser?.id)
        .map(id => ({
            id: id,
            name: userNamesCache.get(id),
            email: userEmailsCache.get(id)
        }));

    console.log('📋 Все пользователи для отображения:', allUsersList);

    const existingChatUserIds = new Set();
    state.chats.forEach(chat => {
        if (chat.type !== 'GROUP' && chat.type !== 1) {
            if (chat.other_user_id) {
                existingChatUserIds.add(chat.other_user_id);
            }
            if (chat.participants) {
                chat.participants.forEach(p => {
                    if (p.id !== state.currentUser?.id) {
                        existingChatUserIds.add(p.id);
                    }
                });
            }
        }
    });

    const chatsWithHistory = state.chats.filter(chat => {
        if (chat.type === 'GROUP' || chat.type === 1) return true;
        return true;
    });

    const usersWithoutChats = allUsersList.filter(user => !existingChatUserIds.has(user.id));

    console.log(`📊 Чатов: ${chatsWithHistory.length}, Пользователей без чатов: ${usersWithoutChats.length}`);

    const { createChatItemElement } = await import('./chat-ui.js');
    const { createUserListItem } = await import('./chat-users-list.js');

    for (const chat of chatsWithHistory) {
        const chatItem = createChatItemElement(chat);
        chatsList.appendChild(chatItem);
    }

    for (const user of usersWithoutChats) {
        const userItem = createUserListItem(user);
        chatsList.appendChild(userItem);
    }

    if (chatsWithHistory.length === 0 && usersWithoutChats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats">Нет других пользователей в системе</div>';
        return;
    }

    if (state.currentChat) {
        const activeItem = chatsList.querySelector(`.chat-item[data-chat-id="${state.currentChat}"], .chat-item[data-user-id="${state.currentChat}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

export async function cleanupChatResources() {
    await stopAllMessageStreams();
    currentChatId = null;
    state.currentChat = null;
}

export function getChatDisplayName(chat) {
    if (!chat) return 'Чат';

    const isGroup = (chat.type === 'GROUP' || chat.type === 1);

    if (isGroup) {
        return chat.name || 'Групповой чат';
    }

    if (chat.other_user_name && chat.other_user_name.trim() !== '') {
        return chat.other_user_name;
    }

    if (chat.other_user_email && chat.other_user_email.trim() !== '') {
        return chat.other_user_email;
    }

    if (chat.participants && Array.isArray(chat.participants) && chat.participants.length > 0) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (other) {
            if (other.name) return other.name;
            if (other.email) return other.email;
        }
    }

    if (chat.other_user_id && userNamesCache.has(chat.other_user_id)) {
        return userNamesCache.get(chat.other_user_id);
    }

    if (chat.id && state.currentUser) {
        const parts = chat.id.split('_');
        for (const part of parts) {
            if (part !== state.currentUser.id && part.length > 5 && userNamesCache.has(part)) {
                chat.other_user_id = part;
                chat.other_user_name = userNamesCache.get(part);
                return userNamesCache.get(part);
            }
        }
    }

    const shortId = chat.id?.slice(-8) || 'unknown';
    return `Пользователь ${shortId}`;
}

export function getChatDisplayEmail(chat) {
    if (!chat) return null;

    const isGroup = (chat.type === 'GROUP' || chat.type === 1);
    if (isGroup) return null;

    if (chat.other_user_email) return chat.other_user_email;

    if (chat.other_user_id && userEmailsCache.has(chat.other_user_id)) {
        return userEmailsCache.get(chat.other_user_id);
    }

    return null;
}

export function isGroupChat(chat) {
    return (chat?.type === 'GROUP' || chat?.type === 1);
}

export function getOtherParticipantId(chat) {
    if (isGroupChat(chat)) return null;
    return chat.other_user_id || null;
}

export const fetchAndCacheUserName = fetchAndCacheUserData;

export async function refreshAllChatNames() {
    await loadAllUsersFromServer();

    for (const chat of state.chats) {
        if (!isGroupChat(chat)) {
            if (chat.other_user_id && userNamesCache.has(chat.other_user_id)) {
                chat.other_user_name = userNamesCache.get(chat.other_user_id);
                chat.other_user_email = userEmailsCache.get(chat.other_user_id);
            }
        }
    }

    await refreshChatsList();

    if (state.currentChat) {
        await updateChatAreaUI();
    }
}