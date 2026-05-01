// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { updateChatAreaUI } from './chat-ui.js';
import { loadMessagesFromServer, stopAllMessageStreams, stopMessageStreamForChat } from './chat-messages.js';
import { showErrorMessage } from './chat-ui.js';

let grpcService;
let currentChatId = null;

export async function setCurrentChat(chatId) {
    console.log(`Установка текущего чата: ${chatId}`);
    
    
    state.currentChat = chatId;
    currentChatId = chatId;
    await updateChatAreaUI(); // Это загрузит сообщения и создаст новый стрим для нового чата
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
        console.log('Получены чаты:', response.chats);

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
        console.error('Ошибка загрузки чатов:', error);
        showErrorMessage('Не удалось загрузить список чатов');
        return [];
    }
}

export async function createNewChat(participantId, participantName) {
    try {
        const { service } = await initGrpc();
        
        if (typeof service.createChat === 'function') {
            try {
                const response = await service.createChat({
                    type: 0,
                    name: participantName || `Чат с пользователем`,
                    participant_ids: [participantId]
                });
                
                console.log('Новый чат создан на сервере:', response);
                await loadChatsFromServer();
                return response.chat || response;
            } catch (serverError) {
                console.warn('Метод createChat на сервере не реализован, создаем локальный чат');
            }
        }
        
        const newChat = {
            id: `chat_${Date.now()}`,
            name: participantName || `Чат с пользователем`,
            type: 'PRIVATE',
            created_at: Math.floor(Date.now() / 1000),
            participants: [state.currentUser?.id, participantId]
        };
        
        if (!state.chats) state.chats = [];
        state.chats.push(newChat);
        
        const chatsList = document.querySelector('.chats-list');
        if (chatsList) {
            const { createChatItemElement } = await import('./chat-ui.js');
            const chatItem = createChatItemElement(newChat);
            chatsList.appendChild(chatItem);
        }
        
        console.log('Новый чат создан локально:', newChat);
        return newChat;
        
    } catch (error) {
        console.error('Ошибка создания чата:', error);
        showErrorMessage('Не удалось создать чат');
        return null;
    }
}

export async function cleanupChatResources() {
    await stopAllMessageStreams();
    currentChatId = null;
    state.currentChat = null;
}

// Получить отображаемое имя чата
export function getChatDisplayName(chat) {
    if (!chat) return 'Чат';
    
    // Если это групповой чат (type === 1)
    if (chat.type === 1) {
        return chat.name || 'Групповой чат';
    }
    
    // Для личного чата (type === 0) - показываем имя собеседника
    if (chat.participants && Array.isArray(chat.participants)) {
        // Находим собеседника (не текущего пользователя)
        const otherParticipant = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (otherParticipant) {
            // Если есть имя - используем его, иначе email без домена
            if (otherParticipant.name) {
                return otherParticipant.name;
            }
            if (otherParticipant.email) {
                return otherParticipant.email.split('@')[0];
            }
            return 'Собеседник';
        }
    }
    
    // Если не нашли, показываем имя чата или fallback
    return chat.name || 'Диалог';
}

// Определить, является ли чат групповым
export function isGroupChat(chat) {
    return chat.type === 1;
}

// Получить ID собеседника в личном чате
export function getOtherParticipantId(chat) {
    if (chat.type === 1 || chat.type === 'GROUP') return null;
    
    if (chat.participants && Array.isArray(chat.participants)) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        return other?.id || null;
    }
    return null;
}