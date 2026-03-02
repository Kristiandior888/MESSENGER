import { showScreen } from '../ui.js';
import { addMessage, updateLastMessageStatusUI } from '../utils/messageUtils.js';
import { state } from '../app.js';
import { getMessages, updateLastMessageStatus } from '../storage.js';

// НАСТРОЙКА ЭКРАНА ЧАТА
function setupChatHandlers() {
    console.log('Чат загружен!');

    // ОТОБРАЖАЕМ ИНФОРМАЦИЮ О ПОЛЬЗОВАТЕЛЕ 
    const userEmail = document.getElementById('user-email');
    if (userEmail && state.currentUser) {
        userEmail.textContent = state.currentUser.email;
    }

    // ЗАГРУЖАЕМ АВАТАР
    const chatAvatar = document.getElementById('chat-avatar');
    if (chatAvatar) {
        if (state.userAvatar) {
            chatAvatar.src = state.userAvatar;
        } else {
            const savedAvatar = localStorage.getItem('userAvatar');
            if (savedAvatar) {
                state.userAvatar = savedAvatar;
                chatAvatar.src = savedAvatar;
            }
        }
    }

    // ПЕРЕХОД В ПРОФИЛЬ ПРИ КЛИКЕ НА АВАТАР
    const avatarWrapper = document.getElementById('avatar-wrapper');
    if (avatarWrapper) {
        avatarWrapper.addEventListener('click', () => {
            showScreen('profile');
        });
    }

    // НАСТРАИВАЕМ ОТПРАВКУ СООБЩЕНИЙ 
    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');

    if (sendBtn && messageField) {
        const sendMessage = () => {
            const text = messageField.value.trim();
            if (text) {
                // 1. Показываем сообщение со статусом 'sending'
                addMessage(text, 'sent', true, 'sending');
                messageField.value = '';
                
                // 2. Через 1 секунду - 'sent'
                setTimeout(() => {
                    updateLastMessageStatusUI('sent');
                    updateLastMessageStatus(state.currentChat, 'sent');
                }, 1000);
                
                // 3. Через 2 секунды - 'delivered'
                setTimeout(() => {
                    updateLastMessageStatusUI('delivered');
                    updateLastMessageStatus(state.currentChat, 'delivered');
                }, 2000);
                
                // 4. Через 3 секунды - 'read'
                setTimeout(() => {
                    updateLastMessageStatusUI('read');
                    updateLastMessageStatus(state.currentChat, 'read');
                }, 3000);
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
            state.isAuthenticated = false;
            state.currentUser = null;
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
            state.currentChat = chatName;
            loadMessagesForChat(chatName);
        });
    });

    // ЗАГРУЖАЕМ СООБЩЕНИЯ ДЛЯ ТЕКУЩЕГО ЧАТА
    loadMessagesForChat(state.currentChat);
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
                
                // Текст сообщения
                const textDiv = document.createElement('div');
                textDiv.className = 'text';
                textDiv.textContent = msg.text;
                
                // Контейнер для времени и статуса
                const metaDiv = document.createElement('div');
                metaDiv.className = 'message-meta';
                
                // Время
                const timeSpan = document.createElement('span');
                timeSpan.className = 'time';
                timeSpan.textContent = msg.time;
                
                // Статус для исходящих
                if (msg.type === 'sent') {
                    const statusSpan = document.createElement('span');
                    statusSpan.className = `message-status ${msg.status || 'sent'}`;
                    metaDiv.appendChild(timeSpan);
                    metaDiv.appendChild(statusSpan);
                } else {
                    metaDiv.appendChild(timeSpan);
                }
                
                messageDiv.appendChild(textDiv);
                messageDiv.appendChild(metaDiv);
                messagesDiv.appendChild(messageDiv);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }
}

export { setupChatHandlers, loadMessagesForChat };