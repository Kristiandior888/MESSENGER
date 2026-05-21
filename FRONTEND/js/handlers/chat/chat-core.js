// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { updateChatAreaUI } from './chat-ui.js';
import { loadMessagesFromServer, stopAllMessageStreams } from './chat-messages.js';
import { showErrorMessage } from './chat-ui.js';

let grpcService;
let currentChatId = null;
let allUsers = [];

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
        
        allUsers = (response.users || []).filter(user => user.id !== state.currentUser?.id);
        
        console.log(`📋 Загружено ${allUsers.length} пользователей`);
        return allUsers;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
        return [];
    }
}

export function getAllUsers() {
    return [...allUsers];
}

export function findUserById(userId) {
    return allUsers.find(user => user.id === userId);
}

export async function loadChatsFromServer() {
    const { service } = await initGrpc();
    console.log('👤 Текущий пользователь:', state.currentUser); 
    
    try {
        const [chatsResponse, users] = await Promise.all([
            service.getChats(),
            loadAllUsersFromServer()
        ]);
        
        console.log('Получены чаты:', chatsResponse.chats);
        console.log('Получены пользователи:', users);

        const existingChats = chatsResponse.chats || [];
        
        // Создаем карту существующих приватных чатов
        const existingPrivateChatsMap = new Map();
        existingChats.forEach(chat => {
            if (chat.type === 0 && chat.participants) {
                chat.participants.forEach(p => {
                    if (p.id !== state.currentUser?.id) {
                        existingPrivateChatsMap.set(p.id, chat);
                    }
                });
            }
        });
        
        // Создаем виртуальные чаты для пользователей без диалогов
        const virtualChats = users
            .filter(user => !existingPrivateChatsMap.has(user.id))
            .map(user => ({
                id: `temp_${user.id}`,
                name: user.name || user.email.split('@')[0],
                type: 0,
                isVirtual: true,
                realUserId: user.id,
                userData: user,
                participants: [state.currentUser, user],
                avatar_url: user.avatar_url,
                unread_count: 0,
                created_at: Math.floor(Date.now() / 1000)
            }));
        
        // Сохраняем в state: сначала реальные чаты, потом виртуальные
        state.chats = [...existingChats, ...virtualChats];
        
        await refreshChatsList();
        
        return state.chats;
        
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        showErrorMessage('Не удалось загрузить список чатов');
        return [];
    }
}

export async function createRealChatWithUser(userId, userName) {
    try {
        const { service } = await initGrpc();
        
        console.log('🔨 Создание чата с пользователем:', { userId, userName });
        
        // type: 0 = PRIVATE, name: '' (для личных чатов имя не нужно)
        const response = await service.createChat(0, '', [userId]);
        
        console.log('📨 Ответ сервера:', response);
        
        if (response && response.chat) {
            console.log('✅ Чат успешно создан:', response.chat);
            
            // Удаляем виртуальный чат из списка
            const virtualIndex = state.chats.findIndex(c => c.realUserId === userId);
            if (virtualIndex !== -1) {
                state.chats.splice(virtualIndex, 1);
            }
            
            // Добавляем реальный чат в начало списка
            state.chats.unshift(response.chat);
            
            await refreshChatsList();
            
            return response.chat;
        }
        
        throw new Error(response?.error || 'Не удалось создать чат');
        
    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        
        // Создаем временный чат локально
        const tempChat = {
            id: `temp_${Date.now()}_${userId}`,
            name: userName,
            type: 0,
            isVirtual: true,
            realUserId: userId,
            userData: { id: userId, name: userName },
            participants: [state.currentUser, { id: userId, name: userName }],
            created_at: Math.floor(Date.now() / 1000)
        };
        
        console.log('📝 Создан временный чат:', tempChat);
        
        state.chats.unshift(tempChat);
        await refreshChatsList();
        
        return tempChat;
    }
}

export async function refreshChatsList() {
    const chatsList = document.querySelector('.chats-list');
    if (!chatsList) return;
    
    chatsList.innerHTML = '';
    
    if (!state.chats || state.chats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats">Нет чатов. Начните диалог с пользователем!</div>';
        return;
    }
    
    const { createChatItemElement } = await import('./chat-ui.js');
    
    // Сортируем чаты: сначала реальные, потом виртуальные, внутри по дате создания
    const sortedChats = [...state.chats].sort((a, b) => {
        // Виртуальные чаты отправляем вниз
        if (a.isVirtual && !b.isVirtual) return 1;
        if (!a.isVirtual && b.isVirtual) return -1;
        
        // Реальные чаты - по последнему сообщению или дате создания
        const aTime = a.last_message?.timestamp || a.created_at || 0;
        const bTime = b.last_message?.timestamp || b.created_at || 0;
        return bTime - aTime;
    });
    
    for (const chat of sortedChats) {
        const chatItem = createChatItemElement(chat);
        chatsList.appendChild(chatItem);
    }
    
    // Подсвечиваем активный чат
    if (state.currentChat) {
        const activeChat = chatsList.querySelector(`.chat-item[data-chat-id="${state.currentChat}"]`);
        if (activeChat) {
            activeChat.classList.add('active');
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
    
    // Групповой чат
    if (chat.type === 1) {
        return chat.name || 'Групповой чат';
    }
    
    // Виртуальный чат (пользователь без диалога)
    if (chat.isVirtual && chat.userData) {
        return chat.userData.name || chat.userData.email?.split('@')[0] || 'Пользователь';
    }
    
    // Личный чат - показываем имя собеседника
    if (chat.participants && Array.isArray(chat.participants) && chat.participants.length > 0) {
        const otherParticipant = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (otherParticipant) {
            if (otherParticipant.name) return otherParticipant.name;
            if (otherParticipant.email) return otherParticipant.email.split('@')[0];
            return 'Собеседник';
        }
    }
    
    return chat.name || 'Диалог';
}

export function isGroupChat(chat) {
    return chat?.type === 1;
}

export function isVirtualChat(chat) {
    return chat?.isVirtual === true;
}

export function getOtherParticipantId(chat) {
    if (isGroupChat(chat)) return null;
    
    if (chat.isVirtual && chat.realUserId) {
        return chat.realUserId;
    }
    
    if (chat.participants && Array.isArray(chat.participants)) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        return other?.id || null;
    }
    return null;
}