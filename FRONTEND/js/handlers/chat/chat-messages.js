// js/handlers/chat/chat-messages.js
import { state } from '../../app.js';
import { initGrpc, getCurrentChat, isGroupChat } from './chat-core.js';
import { showErrorMessage } from './chat-ui.js';
import { formatMessageTime } from '../../utils/dateUtils.js';

let isLoadingMessages = false;
let lastProcessedMessageIds = new Set();
let isStreamStarted = false;

// Только обновленная функция createMessageElement в chat-messages.js

export function createMessageElement(msg, chat) {
    const isSent = msg.sender_id === state.currentUser?.id;
    const type = isSent ? 'sent' : 'received';
    const timeStr = formatMessageTime(msg.timestamp);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.dataset.messageId = msg.id;

    // Показываем имя отправителя только для полученных сообщений в групповых чатах
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
        
        // Находим текущий чат для отображения имен в группе
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

export async function stopMessageStreamForChat(chatId) {
    console.log(`⚠️ stopMessageStreamForChat вызван для ${chatId}`);
}

export async function stopAllMessageStreams() {
    try {
        const { service } = await initGrpc();
        service.stopGlobalStream();
        isStreamStarted = false;
        lastProcessedMessageIds.clear();
        isLoadingMessages = false;
        console.log(`🛑 Глобальный стрим остановлен`);
    } catch (error) {
        console.error(`❌ Ошибка остановки стрима:`, error);
    }
}

export function resetMessagesState() {
    isLoadingMessages = false;
    console.log('Состояние сообщений сброшено');
}