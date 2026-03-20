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
            
            // НЕ выбираем чат автоматически
            state.currentChat = null;
            
            return true;
        } catch (e) {
            console.error('Ошибка восстановления сессии:', e);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        }
    }
    
    // Если нет сессии, сбрасываем состояние
    state.isAuthenticated = false;
    state.currentUser = null;
    state.token = null;
    return false;
}

// Восстанавливаем сессию
restoreSession();

// Инициализируем тему и настройки
initTheme();
applyAllSettings();

// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена, state.isAuthenticated =', state.isAuthenticated);

    if (state.isAuthenticated) {
        showScreen('chat').then(() => {
            state.currentChat = null;
            import('./js/handlers/chat/index.js').then(module => {
                if (module.updateChatAreaUI) {
                    module.updateChatAreaUI();
                }
            }).catch(err => {
                console.error('Ошибка загрузки chatHandlers:', err);
            });
        });
    } else {
        showScreen('login');
    }
});