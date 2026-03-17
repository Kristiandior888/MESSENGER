// js/handlers/loginHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import grpcService from '../grpc/grpc-service.js';  // ← прямой импорт!

function setupLoginHandlers() {
    console.log('setupLoginHandlers вызвана');

    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!loginBtn) {
        console.error('❌ Кнопка логина не найдена');
        return;
    }

    loginBtn.addEventListener('click', async () => {
        const email = emailInput?.value.trim() || '';
        const password = passwordInput?.value.trim() || '';

        if (!email || !password) {
            alert('Введите email и пароль');
            return;
        }

        loginBtn.textContent = 'Вход...';
        loginBtn.disabled = true;

        try {
            console.log('🔄 Отправка запроса на сервер...');

            const response = await grpcService.login(email, password);

            console.log('✅ Ответ от сервера:', response);

            if (response.success) {
                state.isAuthenticated = true;
                state.token = response.token;
                state.currentUser = {
                    id: response.user.id,
                    email: response.user.email,
                    name: response.user.name,
                    avatar_url: response.user.avatar_url
                };

                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(state.currentUser));

                console.log('👋 Привет,', state.currentUser.name);
                showScreen('chat');
            } else {
                alert('Ошибка входа: ' + (response.error || 'Неизвестная ошибка'));
                loginBtn.textContent = 'Войти';
                loginBtn.disabled = false;
            }
        } catch (error) {
            console.error('❌ Ошибка соединения с сервером:', error);
            alert('Не удалось подключиться к серверу. Проверь, запущен ли бэкенд!');
            loginBtn.textContent = 'Войти';
            loginBtn.disabled = false;
        }
    });
}

export { setupLoginHandlers };