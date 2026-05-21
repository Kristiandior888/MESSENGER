// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { updateChatAreaUI } from './chat-ui.js';
import { loadMessagesFromServer, stopAllMessageStreams } from './chat-messages.js';
import { showErrorMessage } from './chat-ui.js';

let grpcService;
let currentChatId = null;
let allUsers = [];

// Кэш для имен и email пользователей
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

// Загрузка ВСЕХ пользователей с сервера
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
        
        // Заполняем кэш именами и email пользователей
        allUsers.forEach(user => {
            const userName = user.name || user.email?.split('@')[0] || null;
            userNamesCache.set(user.id, userName);
            userEmailsCache.set(user.id, user.email);
        });
        
        // Также добавляем текущего пользователя в кэш
        if (state.currentUser) {
            userNamesCache.set(state.currentUser.id, state.currentUser.name || state.currentUser.email?.split('@')[0] || 'Вы');
            userEmailsCache.set(state.currentUser.id, state.currentUser.email);
        }
        
        console.log(`📋 Загружено ${allUsers.length} пользователей в кэш`);
        
        return allUsers;
        
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
        
        if (response.chats && response.chats.length > 0) {
            console.log('🔍 Первый чат:', JSON.stringify(response.chats[0], null, 2));
        }
        
        // Обрабатываем чаты
        const processedChats = [];
        
        for (const chat of (response.chats || [])) {
            const isGroup = (chat.type === 'GROUP' || chat.type === 1);
            
            if (!isGroup) { // Личный чат
                let otherUserId = null;
                let otherUserName = null;
                let otherUserEmail = null;
                
                // 1. Пытаемся найти ID собеседника из last_message
                if (chat.last_message && chat.last_message.sender_id) {
                    const senderId = chat.last_message.sender_id;
                    if (senderId !== state.currentUser?.id) {
                        otherUserId = senderId;
                    }
                }
                
                // 2. Если не нашли, пытаемся извлечь из ID чата
                if (!otherUserId && chat.id) {
                    if (chat.id.includes(state.currentUser?.id)) {
                        const parts = chat.id.split('_');
                        for (const part of parts) {
                            if (part !== state.currentUser?.id && part.length > 5) {
                                otherUserId = part;
                                break;
                            }
                        }
                    }
                }
                
                // 3. Получаем данные из кэша если нашли ID
                if (otherUserId) {
                    otherUserName = userNamesCache.get(otherUserId) || null;
                    otherUserEmail = userEmailsCache.get(otherUserId) || null;
                }
                
                // 4. Если все еще нет данных, но есть last_message с информацией
                if (!otherUserName && chat.last_message) {
                    if (chat.last_message.sender_name) {
                        otherUserName = chat.last_message.sender_name;
                    }
                    if (chat.last_message.sender_email) {
                        otherUserEmail = chat.last_message.sender_email;
                    }
                }
                
                // 5. Если есть name в чате
                if (!otherUserName && chat.name && chat.name !== '' && chat.name !== 'PRIVATE') {
                    otherUserName = chat.name;
                }
                
                // Сохраняем найденную информацию в чат
                if (otherUserId) {
                    chat.other_user_id = otherUserId;
                }
                if (otherUserName) {
                    chat.other_user_name = otherUserName;
                }
                if (otherUserEmail) {
                    chat.other_user_email = otherUserEmail;
                }
                
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
        return [];
    }
}

export async function createRealChatWithUser(userId, userName, userEmail) {
    try {
        const { service } = await initGrpc();
        
        console.log('🔨 Создание чата с пользователем:', { userId, userName, userEmail });
        
        const existingChat = state.chats.find(chat => {
            if (chat.type === 'GROUP' || chat.type === 1) return false;
            return chat.other_user_id === userId;
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
    
    if (!state.chats || state.chats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats">Нет чатов. Начните диалог с пользователем!</div>';
        return;
    }
    
    const { createChatItemElement } = await import('./chat-ui.js');
    
    const sortedChats = [...state.chats].sort((a, b) => {
        const aTime = a.last_message?.timestamp || a.created_at || 0;
        const bTime = b.last_message?.timestamp || b.created_at || 0;
        return bTime - aTime;
    });
    
    for (const chat of sortedChats) {
        const chatItem = createChatItemElement(chat);
        chatsList.appendChild(chatItem);
    }
    
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

// Функция для получения отображаемого имени (приоритет: имя > email > ID)
export function getChatDisplayName(chat) {
    if (!chat) return 'Чат';
    
    const isGroup = (chat.type === 'GROUP' || chat.type === 1);
    
    if (isGroup) {
        return chat.name || 'Групповой чат';
    }
    
    console.log('🔍 getChatDisplayName для личного чата:', chat.id);
    
    // 1. Проверяем other_user_name (имя)
    if (chat.other_user_name && chat.other_user_name.trim() !== '') {
        console.log('✅ Имя из other_user_name:', chat.other_user_name);
        return chat.other_user_name;
    }
    
    // 2. Проверяем other_user_email (email)
    if (chat.other_user_email && chat.other_user_email.trim() !== '') {
        // Показываем email целиком или только часть до @
        const displayEmail = chat.other_user_email;
        console.log('✅ Email из other_user_email:', displayEmail);
        return displayEmail;
    }
    
    // 3. Проверяем поле name
    if (chat.name && chat.name.trim() !== '' && chat.name !== 'PRIVATE') {
        console.log('✅ Имя из chat.name:', chat.name);
        return chat.name;
    }
    
    // 4. Проверяем participants
    if (chat.participants && Array.isArray(chat.participants) && chat.participants.length > 0) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (other) {
            if (other.name) return other.name;
            if (other.email) return other.email;
        }
    }
    
    // 5. Проверяем last_message для определения собеседника
    if (chat.last_message && chat.last_message.sender_id) {
        const senderId = chat.last_message.sender_id;
        if (senderId !== state.currentUser?.id) {
            // Это сообщение от собеседника
            if (userNamesCache.has(senderId) && userNamesCache.get(senderId)) {
                const name = userNamesCache.get(senderId);
                console.log('✅ Имя из last_message.sender_id:', name);
                chat.other_user_id = senderId;
                chat.other_user_name = name;
                return name;
            }
            if (userEmailsCache.has(senderId)) {
                const email = userEmailsCache.get(senderId);
                console.log('✅ Email из last_message.sender_id:', email);
                chat.other_user_id = senderId;
                chat.other_user_email = email;
                return email;
            }
        }
        if (chat.last_message.sender_name) {
            console.log('✅ Имя из last_message.sender_name:', chat.last_message.sender_name);
            return chat.last_message.sender_name;
        }
        if (chat.last_message.sender_email) {
            console.log('✅ Email из last_message.sender_email:', chat.last_message.sender_email);
            return chat.last_message.sender_email;
        }
    }
    
    // 6. Проверяем other_user_id
    if (chat.other_user_id) {
        if (userNamesCache.has(chat.other_user_id) && userNamesCache.get(chat.other_user_id)) {
            const name = userNamesCache.get(chat.other_user_id);
            console.log('✅ Имя из other_user_id:', name);
            chat.other_user_name = name;
            return name;
        }
        if (userEmailsCache.has(chat.other_user_id)) {
            const email = userEmailsCache.get(chat.other_user_id);
            console.log('✅ Email из other_user_id:', email);
            chat.other_user_email = email;
            return email;
        }
    }
    
    // 7. Пробуем извлечь ID из ID чата
    if (chat.id && state.currentUser) {
        const parts = chat.id.split('_');
        for (const part of parts) {
            if (part !== state.currentUser.id && part.length > 5) {
                if (userNamesCache.has(part) && userNamesCache.get(part)) {
                    const name = userNamesCache.get(part);
                    console.log('✅ Имя из ID чата:', name);
                    chat.other_user_id = part;
                    chat.other_user_name = name;
                    return name;
                }
                if (userEmailsCache.has(part)) {
                    const email = userEmailsCache.get(part);
                    console.log('✅ Email из ID чата:', email);
                    chat.other_user_id = part;
                    chat.other_user_email = email;
                    return email;
                }
            }
        }
        
        if (chat.id !== state.currentUser.id && chat.id.length > 5) {
            if (userNamesCache.has(chat.id) && userNamesCache.get(chat.id)) {
                const name = userNamesCache.get(chat.id);
                console.log('✅ Имя из ID чата (прямой):', name);
                chat.other_user_id = chat.id;
                chat.other_user_name = name;
                return name;
            }
            if (userEmailsCache.has(chat.id)) {
                const email = userEmailsCache.get(chat.id);
                console.log('✅ Email из ID чата (прямой):', email);
                chat.other_user_id = chat.id;
                chat.other_user_email = email;
                return email;
            }
        }
    }
    
    // 8. Если ничего не нашли - показываем ID чата
    console.warn('⚠️ Не удалось определить имя/email для чата:', chat.id);
    
    const shortId = chat.id.slice(-8);
    return `Пользователь ${shortId}`;
}

// Функция для получения email собеседника (если нужно отдельно)
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
            if (chat.other_user_id) {
                if (userNamesCache.has(chat.other_user_id) && userNamesCache.get(chat.other_user_id)) {
                    chat.other_user_name = userNamesCache.get(chat.other_user_id);
                }
                if (userEmailsCache.has(chat.other_user_id)) {
                    chat.other_user_email = userEmailsCache.get(chat.other_user_id);
                }
            } else if (chat.last_message && chat.last_message.sender_id) {
                const senderId = chat.last_message.sender_id;
                if (senderId !== state.currentUser?.id) {
                    chat.other_user_id = senderId;
                    if (userNamesCache.has(senderId) && userNamesCache.get(senderId)) {
                        chat.other_user_name = userNamesCache.get(senderId);
                    }
                    if (userEmailsCache.has(senderId)) {
                        chat.other_user_email = userEmailsCache.get(senderId);
                    }
                }
            }
        }
    }
    
    await refreshChatsList();
    
    if (state.currentChat) {
        await updateChatAreaUI();
    }
}