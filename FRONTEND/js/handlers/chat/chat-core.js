// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { updateChatAreaUI } from './chat-ui.js';
import { loadMessagesFromServer } from './chat-messages.js';
import { showErrorMessage } from './chat-ui.js';

let grpcService;
let grpcStream;

// Текущий выбранный чат
export let currentChatId = null;

/**
 * Установка текущего чата
 */
export function setCurrentChat(chatId) {
    console.log(`Установка текущего чата: ${chatId}`);
    state.currentChat = chatId;
    currentChatId = chatId;
    updateChatAreaUI();
    
    if (chatId) {
        // Загружаем сообщения для этого чата
        import('./chat-messages.js').then(module => {
            module.loadMessagesFromServer(chatId);
        });
    }
}

/**
 * Получение текущего чата
 */
export function getCurrentChat() {
    return state.currentChat || currentChatId;
}

/**
 * Асинхронная инициализация gRPC
 */
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

/**
 * Создание нового чата
 */
export async function createNewChat(participantEmail) {
    try {
        const { service } = await initGrpc();
        
        const chatName = `Чат с ${participantEmail}`;
        
        const response = await service.createChat({
            name: chatName,
            participants: [participantEmail],
            type: 'private'
        });
        
        console.log('✅ Новый чат создан:', response);
        
        const { loadChatsFromServer } = await import('./chat-core.js');
        await loadChatsFromServer();
        
        return response.chat || response;
    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        showErrorMessage('Не удалось создать чат');
        return null;
    }
}

/**
 * Загрузка чатов с сервера
 */
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

            // добавляем async здесь
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