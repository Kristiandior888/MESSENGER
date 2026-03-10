console.log('renderer.js загрузился!');

import { state } from './js/app.js';
import { showScreen } from './js/ui.js';
import { initTheme } from './js/utils/themeUtils.js';
import { applyAllSettings } from './js/utils/settingsUtils.js';

// Инициализируем тему при запуске
initTheme();

// Применяем сохраненные настройки
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


