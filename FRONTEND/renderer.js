console.log('renderer.js загрузился!');

import { state } from './js/app.js';
import { showScreen } from './js/ui.js';
import { initTheme } from './js/utils/themeUtils.js';
import { applyAllSettings } from './js/utils/settingsUtils.js';

// Функция восстановления сессии
function restoreSession() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        try {
            state.token = token;
            state.currentUser = JSON.parse(userData);
            state.isAuthenticated = true;
            console.log('🔄 Сессия восстановлена для:', state.currentUser.email);
            return true;
        } catch (e) {
            console.error('Ошибка восстановления сессии:', e);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        }
    }
    return false;
}

// Сначала восстанавливаем сессию
restoreSession();

// Потом инициализируем тему и настройки
initTheme();
applyAllSettings();

// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена, state.isAuthenticated =', state.isAuthenticated);

    if (state.isAuthenticated) {
        showScreen('chat');
    } else {
        showScreen('login');
    }
});