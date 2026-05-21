/*// Для отладки - делаем state доступным в консоли
// Делаем state глобальным для отладки
window.state = state;

window.debugState = () => {
    console.log('Current user:', state.currentUser);
    console.log('Chats:', state.chats);
    console.log('Current chat:', state.currentChat);
    console.log('Token:', state.token);
    return state;
};

window.debugChats = () => {
    if (state.chats && state.chats.length > 0) {
        state.chats.forEach((chat, index) => {
            console.log(`\n📊 Чат ${index + 1}:`);
            console.log('  ID:', chat.id);
            console.log('  Name:', chat.name);
            console.log('  Type:', chat.type);
            console.log('  Participants:', chat.participants);
            console.log('  Все поля:', Object.keys(chat));
        });
    } else {
        console.log('Нет чатов');
    }
    return state.chats;
};

window.debugMessages = async (chatId) => {
    const { service } = await import('./js/grpc/grpc-service.js');
    const response = await service.getMessages(chatId || state.currentChat, 5);
    if (response.messages && response.messages.length > 0) {
        console.log('📨 Пример сообщения:', response.messages[0]);
        console.log('Все поля сообщения:', Object.keys(response.messages[0]));
    }
    return response.messages;
};

window.debugLastMessage = () => {
    const messages = document.querySelectorAll('.message.sent');
    if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const statusSpan = lastMsg.querySelector('.message-status');
        console.log('Последнее сообщение в DOM:');
        console.log('  Текст:', lastMsg.querySelector('.text')?.textContent);
        console.log('  Класс статуса:', statusSpan?.className);
        console.log('  Стиль before:', window.getComputedStyle(statusSpan, '::before').content);
    }
};
*/




// renderer.js
console.log('renderer.js загрузился!');

import { state } from './js/app.js';
import { showScreen, initScreens } from './js/ui.js';
import { initTheme } from './js/utils/themeUtils.js';
import { applyAllSettings } from './js/utils/settingsUtils.js';

// Очищаем старые данные при каждом запуске для тестирования
state.isAuthenticated = false;
localStorage.removeItem('token');
localStorage.removeItem('userData');
localStorage.removeItem('userAvatar');
localStorage.removeItem('pendingEmail');

function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('pendingEmail');
    state.token = null;
    state.currentUser = null;
    state.userAvatar = null;
}

initTheme();
applyAllSettings();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена, isAuthenticated =', state.isAuthenticated);
    
    await initScreens();
    
    if (state.isAuthenticated) {
        await showScreen('chat');
    } else {
        await showScreen('loginRequest');
    }
});

window.addEventListener('beforeunload', () => {
    if (state.isAuthenticated && state.currentUser && state.token) {
        localStorage.setItem('token', state.token);
        localStorage.setItem('userData', JSON.stringify(state.currentUser));
    }
});