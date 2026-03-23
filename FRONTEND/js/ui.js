// js/ui.js
import { addMessage } from './utils/messageUtils.js';
import { setupLoginHandlers } from './handlers/loginHandlers.js';
import { setupProfileHandlers } from './handlers/profileHandlers.js';
import { setupSettingsHandlers } from './handlers/settingsHandlers.js';

// ЗАГРУЗКА HTML-ФАЙЛОВ
async function loadPage(url) {
    console.log('Загрузка страницы:', url);
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        console.log('Страница загружена, длина:', html.length);
        return html;
    } catch (error) {
        console.error('Ошибка загрузки страницы:', error);
        return '<div style="color: red; padding: 20px;">Ошибка загрузки</div>';
    }
}

// ПОКАЗ ЭКРАНА
async function showScreen(screenName) {
    console.log('showScreen вызвана с параметром:', screenName);

    const content = document.getElementById('content');

    // Если это чат и он уже отображается, не перезагружаем
    if (screenName === 'chat') {
        const existingChat = document.querySelector('.chat-container');
        if (existingChat && existingChat.style.display !== 'none') {
            console.log('Чат уже отображается, не перезагружаем');
            // Просто обновляем UI
            try {
                const chatModule = await import('./handlers/chat/index.js');
                if (chatModule.updateChatAreaUI) {
                    await chatModule.updateChatAreaUI();
                }
                if (chatModule.loadChatsFromServer) {
                    await chatModule.loadChatsFromServer();
                }
            } catch (err) {
                console.error('Ошибка обновления чата:', err);
            }
            return;
        }
    }

    let pageUrl = '';
    if (screenName === 'login') {
        pageUrl = 'pages/login.html';
    } else if (screenName === 'chat') {
        pageUrl = 'pages/chat.html';
    } else if (screenName === 'profile') {
        pageUrl = 'pages/profile.html';
    } else if (screenName === 'settings') {
        pageUrl = 'pages/settings.html';
    }

    if (pageUrl) {
        const html = await loadPage(pageUrl);
        content.innerHTML = html;

        // ПОСЛЕ загрузки HTML вызываем соответствующий обработчик
        if (screenName === 'chat') {
            const chatModule = await import('./handlers/chat/index.js');
            await chatModule.setupChatHandlers();
        } else if (screenName === 'login') {
            try {
                const chatModule = await import('./handlers/chat/index.js');
                if (chatModule.resetChatInitialization) {
                    chatModule.resetChatInitialization();
                }
            } catch (e) {
                // Модуль чата может не загрузиться, это нормально
            }
            setupLoginHandlers();
        } else if (screenName === 'profile') {
            setupProfileHandlers();
        } else if (screenName === 'settings') {
            setupSettingsHandlers();
        }
    } else {
        console.error('Неизвестное имя экрана:', screenName);
    }
}

export { loadPage, showScreen };