// js/ui.js
import { setupLoginHandlers } from './handlers/loginHandlers.js';
import { setupProfileHandlers } from './handlers/profileHandlers.js';
import { setupSettingsHandlers } from './handlers/settingsHandlers.js';

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

async function showScreen(screenName) {
    console.log('showScreen вызвана с параметром:', screenName);

    const content = document.getElementById('content');

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

        if (screenName === 'chat') {
            const chatModule = await import('./handlers/chat/index.js');
            // НЕ сбрасываем флаг! Просто вызываем setupChatHandlers
            await chatModule.setupChatHandlers();
        } else if (screenName === 'login') {
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