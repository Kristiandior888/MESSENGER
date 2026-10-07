// renderer.js
console.log('renderer.js загрузился!');

import { state } from './js/app.js';
import { showScreen, initScreens } from './js/ui.js';
import { initTheme } from './js/utils/themeUtils.js';
import { applyAllSettings } from './js/utils/settingsUtils.js';

// ============================================================
// 🔧 DEBUG-РЕЖИМ: автоматический вход без почты
// ============================================================
// Чтобы вернуть обычный вход через почту — поставьте false
// или закомментируйте весь блок DEBUG целиком.
const DEBUG_AUTO_LOGIN = true;

// Данные для отладки (взяты из реального токена Кристины)
const DEBUG_USER = {
    id: '835ac540-24a1-42a9-87a8-371f5f21895c',
    email: 'student_design@kurganobl.ru',
    name: 'Кристина',
    avatar_url: null
};

const DEBUG_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjgzNWFjNTQwLTI0YTEtNDJhOS04N2E4LTM3MWY1ZjIxODk1YyIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6InN0dWRlbnRfZGVzaWduQGt1cmdhbm9ibC5ydSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6InVzZXIiLCJleHAiOjE3OTEzODg1MjMsImlzcyI6Imdvdi1tZXNzZW5nZXIiLCJhdWQiOiJnb3YtbWVzc2VuZ2VyLWNsaWVudCJ9.kyZAQ7pvw0Ms-lyvKm8sfbIfPzy2V_YwG4SqVKxw5Eg';
// ============================================================

/**
 * Восстановление сессии из localStorage (для обычного режима)
 */
function restoreSession() {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('userData');

    if (savedToken && savedUser) {
        try {
            state.token = savedToken;
            state.currentUser = JSON.parse(savedUser);
            state.isAuthenticated = true;
            console.log('🔓 Сессия восстановлена:', state.currentUser.email);
        } catch (e) {
            console.error('❌ Ошибка восстановления сессии:', e);
            state.isAuthenticated = false;
        }
    } else {
        state.isAuthenticated = false;
    }
}

/**
 * Полная очистка данных авторизации
 */
function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('pendingEmail');
    state.token = null;
    state.currentUser = null;
    state.userAvatar = null;
    state.isAuthenticated = false;
}

// ============================================================
// Инициализация авторизации
// ============================================================
if (DEBUG_AUTO_LOGIN) {
    // ---- DEBUG: принудительный вход ----
    state.isAuthenticated = true;
    state.token = DEBUG_TOKEN;
    state.currentUser = DEBUG_USER;

    localStorage.setItem('token', DEBUG_TOKEN);
    localStorage.setItem('userData', JSON.stringify(DEBUG_USER));

    console.log('🔧 DEBUG-режим: автовход как', DEBUG_USER.email);
} else {
    // ---- ОБЫЧНЫЙ РЕЖИМ: восстановление сессии ----
    restoreSession();
}

// Инициализация темы и настроек
initTheme();
applyAllSettings();

// ============================================================
// Старт приложения
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена, isAuthenticated =', state.isAuthenticated);

    await initScreens();

    if (state.isAuthenticated) {
        await showScreen('chat');
    } else {
        await showScreen('loginRequest');
    }
});

// ============================================================
// Завершение работы
// ============================================================
window.addEventListener('beforeunload', () => {
    if (state.isAuthenticated && state.currentUser && state.token) {
        localStorage.setItem('token', state.token);
        localStorage.setItem('userData', JSON.stringify(state.currentUser));
    }

    // Останавливаем стрим сообщений
    import('./js/handlers/chat/chat-messages.js').then(module => {
        module.stopGlobalMessageStream();
    });
});