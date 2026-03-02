import { showScreen } from '../ui.js';
import { addMessage } from '../utils/messageUtils.js';
import { state } from '../app.js';
import { getMessages } from '../storage.js';

// НАСТРОЙКА ЭКРАНА ЧАТА
function setupChatHandlers() {
    console.log('Чат загружен!');

    // ОТОБРАЖАЕМ ИНФОРМАЦИЮ О ПОЛЬЗОВАТЕЛЕ 
    const userEmail = document.getElementById('user-email');
    if (userEmail && state.currentUser) {  // ← ДОБАВЛЕНО
        userEmail.textContent = state.currentUser.email;
    }

    // НАСТРАИВАЕМ ОТПРАВКУ СООБЩЕНИЙ 
    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');

    if (sendBtn && messageField) {
        const sendMessage = () => {
            const text = messageField.value.trim();
            if (text) {
                addMessage(text, 'sent', true);
                messageField.value = '';

                setTimeout(() => {
                    addMessage('Сообщение доставлено!', 'received', true);
                }, 1000);
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        messageField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // НАСТРАИВАЕМ КНОПКУ ВЫХОДА 
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            state.isAuthenticated = false;  // ← ДОБАВЛЕНО
            state.currentUser = null;        // ← ДОБАВЛЕНО
            showScreen('login');
        });
    }

    // НАСТРАИВАЕМ ПЕРЕКЛЮЧЕНИЕ ЧАТОВ 
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            chatItems.forEach(ci => ci.classList.remove('active'));
            item.classList.add('active');

            const chatName = item.textContent.trim();
            state.currentChat = chatName;  // ← ДОБАВЛЕНО: обновляем текущий чат
            loadMessagesForChat(chatName);
        });
    });

    // ЗАГРУЖАЕМ СООБЩЕНИЯ ДЛЯ ТЕКУЩЕГО ЧАТА
    loadMessagesForChat(state.currentChat);  // ← ИСПРАВЛЕНО: добавил state.
}

// ЗАГРУЗКА СООБЩЕНИЙ ДЛЯ ВЫБРАННОГО ЧАТА
function loadMessagesForChat(chatName) {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = '';

        const messages = getMessages(chatName);

        if (messages.length > 0) {
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.type}`;
                messageDiv.innerHTML = `
                    <div class="text">${msg.text}</div>
                    <div class="time">${msg.time}</div>
                `;
                messagesDiv.appendChild(messageDiv);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }
}

export { setupChatHandlers, loadMessagesForChat };