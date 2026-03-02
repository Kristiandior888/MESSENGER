//работа с сообщениями

import { saveMessage } from '../storage.js';
import { state } from '../app.js';

// ФУНКЦИЯ ДОБАВЛЕНИЯ СООБЩЕНИЯ 
function addMessage(text, type, saveToStorage = true) {
    console.log('addMessage вызвана:', text, type, 'сохранять?', saveToStorage);

    // Получаем текущее время
    const time = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // СОХРАНЯЕМ В ХРАНИЛИЩЕ
    if (saveToStorage && state.currentChat) {  // ← ИСПРАВЛЕНО:  state.
        console.log('Сохраняем сообщение в хранилище для чата:', state.currentChat);
        saveMessage(state.currentChat, text, type, time);  // ← ИСПРАВЛЕНО: state.
    }

    // ПОКАЗЫВАЕМ В ОКНЕ ЧАТА
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        messageDiv.innerHTML = `
            <div class="text">${text}</div>
            <div class="time">${time}</div>
        `;

        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

export { addMessage };