// js/handlers/chat/chat-list.js

import { state } from '../../app.js';
import { initGrpc } from './grpc-init.js';       
import { showErrorMessage } from './chat-ui.js';
import {
    loadAllUsersFromServer,
    getAllUsersFromCache,
} from './chat-users.js';

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
                        const cachedName = getAllUsersFromCache().find(u => u.id === senderId)?.name;
                        const cachedEmail = getAllUsersFromCache().find(u => u.id === senderId)?.email;
                        if (cachedName) otherUserName = cachedName;
                        if (cachedEmail) otherUserEmail = cachedEmail;
                    }
                }

                if (!otherUserId && chat.id && state.currentUser) {
                    const parts = chat.id.split('_');
                    for (const part of parts) {
                        if (part !== state.currentUser.id && part.length > 5) {
                            const cachedUser = getAllUsersFromCache().find(u => u.id === part);
                            if (cachedUser) {
                                otherUserId = part;
                                otherUserName = cachedUser.name;
                                otherUserEmail = cachedUser.email;
                                break;
                            }
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

        // Обновляем список чатов через единую функцию
        const { updateChatsList } = await import('../groups/index.js');
        await updateChatsList();

        return state.chats;

    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        showErrorMessage('Не удалось загрузить список чатов');

        await loadAllUsersFromServer();
        const { updateChatsList } = await import('../groups/index.js');
        await updateChatsList();

        return [];
    }
}

/**
 * Создать или найти существующий личный чат с пользователем.
 */
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

        const response = await service.createChat('PRIVATE', '', [userId]);

        console.log('📨 Ответ сервера:', response);

        if (response && response.chat) {
            const newChat = response.chat;
            newChat.other_user_id = userId;
            newChat.other_user_name = userName;
            newChat.other_user_email = userEmail;

            state.chats.unshift(newChat);

            const { updateChatsList } = await import('../groups/index.js');
            await updateChatsList();

            return newChat;
        }

        throw new Error(response?.error || 'Не удалось создать чат');

    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        throw error;
    }
}