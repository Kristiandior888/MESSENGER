// js/handlers/chat/chat-messages.js
import { state } from '../../app.js';
import { initGrpc, getCurrentChat } from './chat-core.js';
import { showErrorMessage } from './chat-ui.js';
import { createFileElement } from './chat-files.js';
import { searchState, highlightSearchResults } from '../../utils/searchUtils.js';

// Текущий отображаемый чат
let currentDisplayedChat = null;

/**
 * Форматирование времени сообщения
 */
export function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        let date;
        const timestampNum = Number(timestamp);
        
        if (timestampNum < 10000000000) {
            date = new Date(timestampNum * 1000);
        } else {
            date = new Date(timestampNum);
        }
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('❌ Ошибка форматирования времени:', error);
        return '';
    }
}

/**
 * Форматирование даты для разделителя
 */
export function formatMessageDate(timestamp) {
    if (!timestamp) return '';
    
    try {
        const timestampNum = Number(timestamp);
        let date;
        
        if (timestampNum < 10000000000) {
            date = new Date(timestampNum * 1000);
        } else {
            date = new Date(timestampNum);
        }
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Сегодня';
        }
        
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Вчера';
        }
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return '';
    }
}

/**
 * Создание разделителя по дате
 */
function createDateSeparator(dateStr) {
    const separator = document.createElement('div');
    separator.className = 'message-date-separator';
    separator.textContent = dateStr;
    return separator;
}

/**
 * Создание элемента сообщения
 */
export function createMessageElement(msg) {
    const type = msg.sender_id === state.currentUser?.id ? 'sent' : 'received';
    const timeStr = formatMessageTime(msg.timestamp);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.dataset.messageId = msg.id;

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

/**
 * Группировка сообщений по датам
 */
function groupMessagesByDate(messages) {
    const groups = {};
    
    messages.forEach(msg => {
        const dateStr = formatMessageDate(msg.timestamp);
        if (!dateStr) return;
        
        if (!groups[dateStr]) {
            groups[dateStr] = [];
        }
        groups[dateStr].push(msg);
    });
    
    return groups;
}

/**
 * Отображение сообщений в DOM
 */
function displayMessages(chatId, messages) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    messagesDiv.innerHTML = '';

    if (!messages || messages.length === 0) {
        messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
        return;
    }

    // Сортируем сообщения (старые сверху)
    const sortedMessages = [...messages].sort((a, b) => {
        const timeA = Number(a.timestamp) || 0;
        const timeB = Number(b.timestamp) || 0;
        return timeA - timeB;
    });

    const groupedMessages = groupMessagesByDate(sortedMessages);
    
    const dates = Object.keys(groupedMessages).sort((a, b) => {
        return a.localeCompare(b);
    });

    dates.forEach(dateStr => {
        messagesDiv.appendChild(createDateSeparator(dateStr));
        
        groupedMessages[dateStr].forEach(msg => {
            const messageElement = createMessageElement(msg);
            messagesDiv.appendChild(messageElement);
        });
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    currentDisplayedChat = chatId;
}

/**
 * Загрузка сообщений с сервера
 */
export async function loadMessagesFromServer(chatId) {
    if (!chatId) return;
    
    console.log(`🔄 Загрузка сообщений с сервера для чата ${chatId}...`);
    
    try {
        const { service } = await initGrpc();
        const response = await service.getMessages(chatId, 50);
        
        console.log('💬 Получены сообщения:', response.messages);
        displayMessages(chatId, response.messages || []);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки сообщений:', error);
        showErrorMessage('Не удалось загрузить сообщения');
    }
}

/**
 * Загрузка сообщений для чата (алиас для обратной совместимости)
 */
export async function loadMessagesForChat(chatId) {
    return loadMessagesFromServer(chatId);
}

/**
 * Добавление нового сообщения - просто перезагружаем сообщения
 */
export function addNewMessage(chatId, message) {
    if (!chatId || !message) return;
    
    console.log('📥 Добавлено новое сообщение:', message);
    
    if (currentDisplayedChat === chatId) {
        loadMessagesFromServer(chatId);
    }
}