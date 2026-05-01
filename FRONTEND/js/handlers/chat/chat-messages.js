// js/handlers/chat/chat-messages.js
import { state } from '../../app.js';
import { initGrpc, getCurrentChat, isGroupChat, getChatDisplayName } from './chat-core.js';
import { showErrorMessage } from './chat-ui.js';
import { formatMessageTime, formatMessageDate } from '../../utils/dateUtils.js';

let isLoadingMessages = false;
let lastProcessedMessageIds = new Set();
let isStreamStarted = false;


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
        // Ищем имя отправителя среди участников чата
        let senderName = 'Пользователь';
        
        if (chat.participants && Array.isArray(chat.participants)) {
            const sender = chat.participants.find(p => p.id === msg.sender_id);
            if (sender) {
                senderName = sender.name || sender.email?.split('@')[0] || 'Пользователь';
            }
        }
        
        // Если есть поле sender_name в сообщении
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
        const [response, chatResponse] = await Promise.all([
            service.getMessages(chatId, 50),
            service.getChats() // Получаем список чатов для информации о текущем чате
        ]);
        
        const currentChat = chatResponse.chats?.find(c => c.id === chatId);
        
        console.log('💬 Получены сообщения:', response.messages?.length || 0);
        
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        messagesDiv.innerHTML = '';
        lastProcessedMessageIds.clear();
        
        if (!response.messages || response.messages.length === 0) {
            messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
            if (!isStreamStarted) {
                await startGlobalStreamOnce();
            }
            isLoadingMessages = false;
            return;
        }
        
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
        
        if (!isStreamStarted) {
            await startGlobalStreamOnce();
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки сообщений:', error);
        showErrorMessage('Не удалось загрузить сообщения');
    } finally {
        isLoadingMessages = false;
    }
}

async function startGlobalStreamOnce() {
    if (isStreamStarted) {
        console.log('⚠️ Глобальный стрим уже запущен');
        return;
    }
    
    if (!state.chats || state.chats.length === 0) {
        console.log('⏳ Ждём загрузки чатов...');
        await new Promise(resolve => {
            const checkChats = setInterval(() => {
                if (state.chats && state.chats.length > 0) {
                    clearInterval(checkChats);
                    resolve();
                }
            }, 100);
        });
    }
    
    try {
        const { service } = await initGrpc();
        
        service.startGlobalStream(async (message) => {
            const currentChatId = getCurrentChat();
            
            // Получаем информацию о чате для сообщения
            const chat = state.chats?.find(c => c.id === message.chat_id);
            
            if (currentChatId === message.chat_id) {
                console.log(`✨ Новое сообщение в реальном времени:`, message);
                appendNewMessage(message.chat_id, message, chat);
            } else {
                console.log(`📩 Новое сообщение в чате ${message.chat_id}`);
                // Можно добавить уведомление
            }
        });
        
        isStreamStarted = true;
        console.log(`✅ Глобальный стрим запущен`);
    } catch (error) {
        console.error(`❌ Не удалось запустить стрим:`, error);
    }
}

export async function stopMessageStreamForChat(chatId) {
    console.log(`⚠️ stopMessageStreamForChat вызван для ${chatId}, но глобальный стрим не останавливается`);
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