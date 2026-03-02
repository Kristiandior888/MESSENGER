//управлнеие экранами

import { addMessage } from './utils/messageUtils.js';
import { setupLoginHandlers } from './handlers/loginHandlers.js';
import { setupChatHandlers } from './handlers/chatHandlers.js';

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
    console.log('Найден контейнер content:', content);

    let pageUrl = '';
    if (screenName === 'login') {
        pageUrl = 'pages/login.html';
    } else if (screenName === 'chat') {
        pageUrl = 'pages/chat.html';
    }

    if (pageUrl) {
        const html = await loadPage(pageUrl);
        content.innerHTML = html;

        if (screenName === 'chat') {
            setupChatHandlers();
        } else if (screenName === 'login') {
            setupLoginHandlers();
        }
    } else {
        console.error('Неизвестное имя экрана:', screenName);
    }
}

export { showScreen };