// работа с сообщениями

import { saveMessage } from '../storage.js';
import { state } from '../app.js';

// ФУНКЦИЯ ДОБАВЛЕНИЯ СООБЩЕНИЯ 
function addMessage(text, type, saveToStorage = true, status = 'sent') {
    console.log('addMessage вызвана:', text, type, 'статус:', status);

    // Получаем текущее время
    const time = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // СОХРАНЯЕМ В ХРАНИЛИЩЕ
    if (saveToStorage && state.currentChat) {
        console.log('Сохраняем сообщение в хранилище для чата:', state.currentChat);
        saveMessage(state.currentChat, text, type, time, status);
    }

    // ПОКАЗЫВАЕМ В ОКНЕ ЧАТА
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        // Текст сообщения
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = text;
        
        // Контейнер для времени и статуса (ВСЕГДА В ОДНОЙ СТРОКЕ)
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        
        // Время
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = time;
        
        // Статус (только для исходящих)
        if (type === 'sent') {
            const statusSpan = document.createElement('span');
            statusSpan.className = `message-status ${status}`;
            metaDiv.appendChild(timeSpan);
            metaDiv.appendChild(statusSpan);
        } else {
            metaDiv.appendChild(timeSpan);
        }
        
        messageDiv.appendChild(textDiv);
        messageDiv.appendChild(metaDiv);
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

// Функция для обновления статуса последнего сообщения в UI
function updateLastMessageStatusUI(newStatus) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const sentMessages = messagesDiv.querySelectorAll('.message.sent');
    if (sentMessages.length > 0) {
        const lastMessage = sentMessages[sentMessages.length - 1];
        const statusSpan = lastMessage.querySelector('.message-status');
        if (statusSpan) {
            statusSpan.className = `message-status ${newStatus}`;
            console.log(`UI статус обновлен на ${newStatus}`);
        }
    }
}

export { addMessage, updateLastMessageStatusUI };