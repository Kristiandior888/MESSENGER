import { showScreen } from '../ui.js';
import { addMessage } from '../utils/messageUtils.js';
import { state } from '../app.js';
import { getMessages } from '../storage.js';

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
        // Если есть сохраненный аватар в состоянии
        if (state.userAvatar) {
            chatAvatar.src = state.userAvatar;
        } 
        // Или в localStorage
        else {
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