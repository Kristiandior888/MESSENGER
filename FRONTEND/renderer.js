console.log('renderer.js загрузился!');

import { state } from './js/app.js';
import { showScreen } from './js/ui.js';

// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена, isAuthenticated =', state.isAuthenticated);

    if (state.isAuthenticated) {
        showScreen('chat');
    } else {
        showScreen('login');
    }
});