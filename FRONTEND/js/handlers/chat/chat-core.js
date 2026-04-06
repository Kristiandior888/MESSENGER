// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { updateChatAreaUI } from './chat-ui.js';
import { loadMessagesFromServer, stopAllMessageStreams, stopMessageStreamForChat } from './chat-messages.js';
import { showErrorMessage } from './chat-ui.js';

let grpcService;
let currentChatId = null;
let grpcStream = null; // Добавляем переменную для grpcStream

export async function setCurrentChat(chatId) {
    console.log(`Установка текущего чата: ${chatId}`);
    
    if (currentChatId && currentChatId !== chatId) {
        await stopMessageStreamForChat(currentChatId);
    }
    
    state.currentChat = chatId;
    currentChatId = chatId;
    updateChatAreaUI();
    
    if (chatId) {
        await loadMessagesFromServer(chatId);
    }
}

export function getCurrentChat() {
    return state.currentChat || currentChatId;
}

export async function initGrpc() {
    if (!grpcService) {
        const serviceModule = await import('../../grpc/grpc-service.js');
        grpcService = serviceModule.default || serviceModule;

        const streamModule = await import('../../grpc/grpc-stream.js');
        grpcStream = streamModule.default || streamModule;
    }
    return { service: grpcService, stream: grpcStream };
}

/**
 * Проверка существования чата на сервере
 */
export async function checkChatExists(chatId) {
    try {
        const { service } = await initGrpc();
        const response = await service.getChats();
        
        const exists = response.chats?.some(chat => chat.id === chatId);
        console.log(`🔍 Чат ${chatId} ${exists ? 'существует' : 'не существует'} на сервере`);
        return exists;
    } catch (error) {
        console.error('❌ Ошибка проверки существования чата:', error);
        return false;
    }
}

export async function loadChatsFromServer() {
    const { service } = await initGrpc();
    console.log('👤 Текущий пользователь:', state.currentUser); 
    
    try {
        const response = await service.getChats();
        console.log('📋 Получены чаты:', response.chats);

        state.chats = response.chats || [];
        
        const chatsList = document.querySelector('.chats-list');
        if (!chatsList) return [];

        if (response.chats && response.chats.length > 0) {
            chatsList.innerHTML = '';
            
            state.chats = response.chats;

            for (const chat of response.chats) {
                const { createChatItemElement } = await import('./chat-ui.js');
                const chatItem = createChatItemElement(chat);
                chatsList.appendChild(chatItem);
            }
        } else {
            chatsList.innerHTML = '<div class="no-chats">Нет чатов. Создайте новый чат или напишите кому-нибудь.</div>';
        }

        return response.chats;
    } catch (error) {
        console.error('❌ Ошибка загрузки чатов:', error);
        showErrorMessage('Не удалось загрузить список чатов');
        return [];
    }
}

/**
 * Создание нового чата (единая версия)
 */
export async function createNewChat(participantId, participantName) {
    try {
        const { service } = await initGrpc();
        
        // Проверяем, есть ли метод createChat на сервере
        if (typeof service.createChat === 'function') {
            try {
                const response = await service.createChat({
                    type: 0, // PRIVATE
                    name: participantName || `Чат с пользователем`,
                    participant_ids: [participantId]
                });
                
                console.log('✅ Новый чат создан на сервере:', response);
                
                // Загружаем обновленный список чатов
                await loadChatsFromServer();
                
                return response.chat || response;
            } catch (serverError) {
                console.warn('⚠️ Метод createChat на сервере не реализован, создаем локальный чат');
            }
        }
        
        // Локальное создание чата (для демо-режима)
        const newChat = {
            id: `chat_${Date.now()}`,
            name: participantName || `Чат с пользователем`,
            type: 'PRIVATE',
            created_at: Math.floor(Date.now() / 1000),
            participants: [state.currentUser?.id, participantId]
        };
        
        // Добавляем чат в состояние
        if (!state.chats) state.chats = [];
        state.chats.push(newChat);
        
        // Обновляем список чатов в UI
        const chatsList = document.querySelector('.chats-list');
        if (chatsList) {
            const { createChatItemElement } = await import('./chat-ui.js');
            const chatItem = createChatItemElement(newChat);
            chatsList.appendChild(chatItem);
        }
        
        console.log('✅ Новый чат создан локально:', newChat);
        return newChat;
        
    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        showErrorMessage('Не удалось создать чат');
        return null;
    }
}

export async function cleanupChatResources() {
    await stopAllMessageStreams();
    currentChatId = null;
    state.currentChat = null;
}

// Экспортируем grpcStream для использования в других модулях
export { grpcStream };

