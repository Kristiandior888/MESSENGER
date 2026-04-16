console.log('renderer.js загрузился!');

import { state } from './js/app.js';
import { showScreen, initScreens } from './js/ui.js';
import { initTheme } from './js/utils/themeUtils.js';
import { applyAllSettings } from './js/utils/settingsUtils.js';

// Проверяем сохраненного пользователя
const token = localStorage.getItem('token');
const userData = localStorage.getItem('userData');

if (token && userData) {
    try {
        state.token = token;
        state.currentUser = JSON.parse(userData);
        state.isAuthenticated = true;
        console.log('👋 Добро пожаловать обратно,', state.currentUser.email);
    } catch (e) {
        console.error('Ошибка восстановления:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        state.isAuthenticated = false;
    }
} else {
    state.isAuthenticated = false;
}

// Инициализируем тему и настройки
initTheme();
applyAllSettings();

// ЗАПУСК ПРИ ЗАГРУЗКЕ
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена, isAuthenticated =', state.isAuthenticated);
    
    // Инициализируем все экраны один раз
    await initScreens();
    
    if (state.isAuthenticated) {
        await showScreen('chat');
    } else {
        await showScreen('login');
    }
});

// При закрытии сохраняем данные
window.addEventListener('beforeunload', () => {
    if (state.isAuthenticated && state.currentUser && state.token) {
        localStorage.setItem('token', state.token);
        localStorage.setItem('userData', JSON.stringify(state.currentUser));
    }
});