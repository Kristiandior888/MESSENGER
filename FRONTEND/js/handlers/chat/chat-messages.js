// js/handlers/chat/chat-messages.js

import { state } from '../../app.js';
import { initGrpc, getCurrentChat, isGroupChat } from './chat-core.js';
import { showErrorMessage } from './chat-ui.js';
import { formatMessageTime } from '../../utils/dateUtils.js';
import { refreshChatsList } from './chat-core.js';

let isLoadingMessages = false;
let lastProcessedMessageIds = new Set();
let isStreamStarted = false;
let messageStream = null;
let reconnectTimeout = null;
let isShuttingDown = false; // Флаг для предотвращения повторных попыток при выходе

export function createMessageElement(msg, chat) {
    const isSent = msg.sender_id === state.currentUser?.id;
    const type = isSent ? 'sent' : 'received';
    const timeStr = formatMessageTime(msg.timestamp);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.dataset.messageId = msg.id;

    const isGroup = isGroupChat(chat);
    
    if (isGroup && !isSent) {
        let senderName = 'Пользователь';
        
        if (chat.participants && Array.isArray(chat.participants)) {
            const sender = chat.participants.find(p => p.id === msg.sender_id);
            if (sender) {
                senderName = sender.name || sender.email?.split('@')[0] || 'Пользователь';
            }
        }
        
        if (msg.sender_name) {
            senderName = msg.sender_name;
        }
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'message-sender';
        senderDiv.textContent = senderName;
        messageDiv.appendChild(senderDiv);
    }

    if (msg.text) {
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = msg.text;
        messageDiv.appendChild(textDiv);
    }

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';

    if (timeStr) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = timeStr;
        metaDiv.appendChild(timeSpan);
    }

    if (type === 'sent') {
        const statusSpan = document.createElement('span');
        const status = msg.status?.toLowerCase() || 'sent';
        statusSpan.className = `message-status ${status}`;
        metaDiv.appendChild(statusSpan);
    }

    messageDiv.appendChild(metaDiv);
    
    return messageDiv;
}

export function appendNewMessage(chatId, message, chat) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return false;
    
    const currentChat = getCurrentChat();
    if (currentChat !== chatId) return false;
    
    if (lastProcessedMessageIds.has(message.id)) {
        console.log('⚠️ Сообщение уже было обработано, пропускаем:', message.id);
        return false;
    }
    
    if (document.querySelector(`.message[data-message-id="${message.id}"]`)) {
        console.log('⚠️ Сообщение уже есть в DOM, пропускаем:', message.id);
        return false;
    }
    
    console.log(`📥 Добавляем новое сообщение в чат ${chatId}:`, message);
    
    lastProcessedMessageIds.add(message.id);
    
    if (lastProcessedMessageIds.size > 100) {
        const toDelete = [...lastProcessedMessageIds][0];
        lastProcessedMessageIds.delete(toDelete);
    }
    
    const messageElement = createMessageElement(message, chat);
    
    const noMessagesDiv = messagesDiv.querySelector('.no-messages');
    if (noMessagesDiv) {
        noMessagesDiv.remove();
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    return true;
}

export async function loadMessagesFromServer(chatId) {
    if (!chatId) return;
    
    console.log(`🔄 Загрузка сообщений с сервера для чата ${chatId}...`);
    isLoadingMessages = true;
    
    try {
        const { service } = await initGrpc();
        const response = await service.getMessages(chatId, 50);
        
        console.log('💬 Получены сообщения:', response.messages?.length || 0);
        
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        messagesDiv.innerHTML = '';
        lastProcessedMessageIds.clear();
        
        if (!response.messages || response.messages.length === 0) {
            messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
            isLoadingMessages = false;
            return;
        }
        
        const currentChat = state.chats?.find(c => c.id === chatId);
        
        const sortedMessages = [...response.messages].sort((a, b) => {
            const timeA = Number(a.timestamp) || 0;
            const timeB = Number(b.timestamp) || 0;
            return timeA - timeB;
        });
        
        sortedMessages.forEach(msg => {
            lastProcessedMessageIds.add(msg.id);
        });
        
        sortedMessages.forEach(msg => {
            const messageElement = createMessageElement(msg, currentChat);
            messagesDiv.appendChild(messageElement);
        });
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки сообщений:', error);
        showErrorMessage('Не удалось загрузить сообщения');
    } finally {
        isLoadingMessages = false;
    }
}

/**
 * Запуск стрима для получения сообщений в реальном времени
 */
export async function startGlobalMessageStream() {
    // Не запускаем стрим если:
    // 1. Уже запущен
    // 2. Идет завершение работы
    // 3. Нет токена авторизации
    if (isStreamStarted) {
        console.log('⚠️ Стрим уже запущен');
        return;
    }
    
    if (isShuttingDown) {
        console.log('⚠️ Пропускаем запуск стрима - идет завершение работы');
        return;
    }
    
    if (!state.token) {
        console.log('⚠️ Нет токена авторизации, стрим не запущен');
        return;
    }
    
    try {
        const { service } = await initGrpc();
        
        // Останавливаем старый стрим если есть
        await stopGlobalMessageStream();
        
        // Получаем ID всех чатов пользователя
        const chatIds = state.chats?.map(chat => chat.id).filter(id => id && !id.startsWith('temp_')) || [];
        
        if (chatIds.length === 0) {
            console.log('Нет чатов для стрима, откладываем запуск');
            setTimeout(() => {
                if (!isShuttingDown && !isStreamStarted) {
                    startGlobalMessageStream();
                }
            }, 2000);
            return;
        }
        
        console.log(`🚀 Запуск стрима для чатов:`, chatIds);
        
        // Создаем метаданные с токеном
        const Metadata = window.grpc?.Metadata;
        if (!Metadata) {
            console.error('❌ Metadata не доступен');
            return;
        }
        
        const metadata = new Metadata();
        if (state.token) {
            metadata.add('authorization', `Bearer ${state.token}`);
        }
        
        // Запускаем стрим
        if (typeof service.client.StreamMessages !== 'function') {
            console.warn('⚠️ Метод StreamMessages не реализован на сервере');
            return;
        }
        
        messageStream = service.client.StreamMessages({ chat_ids: chatIds }, metadata);
        
        messageStream.on('data', (message) => {
            console.log(`📨 Получено сообщение в реальном времени:`, message);
            
            const chat = state.chats?.find(c => c.id === message.chat_id);
            if (!chat) {
                console.warn(`⚠️ Чат ${message.chat_id} не найден в state.chats`);
                return;
            }
            
            if (state.currentChat === message.chat_id) {
                appendNewMessage(message.chat_id, message, chat);
            }
            
            updateChatLastMessage(message.chat_id, message);
        });
        
        messageStream.on('error', (error) => {
            // Игнорируем ошибку CANCELLED при нормальном завершении
            if (error.code === 1 && isShuttingDown) {
                console.log('🔇 Стрим отменен при завершении работы');
                return;
            }
            console.error('❌ Ошибка стрима:', error.code, error.message);
            isStreamStarted = false;
            messageStream = null;
            
            // Переподключаемся только если не в процессе завершения
            if (!isShuttingDown && !isStreamStarted) {
                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(() => {
                    console.log('🔄 Переподключение стрима...');
                    startGlobalMessageStream();
                }, 5000);
            }
        });
        
        messageStream.on('end', () => {
            console.log('🔚 Стрим завершен сервером');
            isStreamStarted = false;
            messageStream = null;
            
            if (!isShuttingDown && !isStreamStarted) {
                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(() => {
                    console.log('🔄 Переподключение стрима после завершения...');
                    startGlobalMessageStream();
                }, 3000);
            }
        });
        
        isStreamStarted = true;
        console.log('✅ Глобальный стрим сообщений запущен');
        
    } catch (error) {
        console.error('❌ Ошибка запуска стрима:', error);
        isStreamStarted = false;
        messageStream = null;
        
        if (!isShuttingDown) {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
                startGlobalMessageStream();
            }, 5000);
        }
    }
}

/**
 * Остановка глобального стрима
 */
export async function stopGlobalMessageStream() {
    isShuttingDown = true;
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    
    if (messageStream) {
        try {
            // Удаляем все слушатели перед отменой
            messageStream.removeAllListeners();
            // Отменяем стрим
            messageStream.cancel();
            console.log('🛑 Стрим отменен');
        } catch (e) {
            console.warn('Ошибка при отмене стрима:', e.message);
        }
        messageStream = null;
    }
    
    isStreamStarted = false;
    console.log('🛑 Глобальный стрим остановлен');
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
        isShuttingDown = false;
    }, 500);
}

/**
 * Обновление последнего сообщения в списке чатов
 */
function updateChatLastMessage(chatId, message) {
    const chat = state.chats?.find(c => c.id === chatId);
    if (chat) {
        chat.last_message = message;
        refreshChatsList();
    }
}

export async function stopMessageStreamForChat(chatId) {
    console.log(`⚠️ stopMessageStreamForChat вызван для ${chatId}`);
}

export async function stopAllMessageStreams() {
    await stopGlobalMessageStream();
    lastProcessedMessageIds.clear();
    isLoadingMessages = false;
    console.log(`🛑 Все стримы остановлены`);
}

export function resetMessagesState() {
    isLoadingMessages = false;
    console.log('Состояние сообщений сброшено');
}