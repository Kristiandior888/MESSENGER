// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { updateChatAreaUI } from './chat-ui.js';
import { loadMessagesFromServer, stopAllMessageStreams, stopMessageStreamForChat } from './chat-messages.js';
import { showErrorMessage } from './chat-ui.js';

let grpcService;
let currentChatId = null;

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
    }
    return { service: grpcService };
}

export async function loadChatsFromServer() {
    const { service } = await initGrpc();
    console.log('👤 Текущий пользователь:', state.currentUser); 
    
    try {
        const response = await service.getChats();
        console.log('📋 Получены чаты:', response.chats);

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
 * Создание нового чата
 */
export async function createNewChat(participantId, participantName) {
    try {
        const { service } = await initGrpc();
        
        // Временно создаем локальный чат, так как на сервере может не быть метода createChat
        const newChat = {
            id: `chat_${Date.now()}`,
            name: participantName || `Чат с пользователем`,
            type: 'PRIVATE',
            created_at: Math.floor(Date.now() / 1000)
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
        
        console.log('✅ Новый чат создан:', newChat);
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