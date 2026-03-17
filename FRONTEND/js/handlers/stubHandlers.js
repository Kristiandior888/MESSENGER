// js/handlers/loginHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import grpcService from '../grpc/grpc-service.js';  // ← прямой импорт!

function setupLoginHandlers() {
    console.log('setupLoginHandlers вызвана');

    const loginBtn = document.getElementById('ggg');
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

            const response = await grpcService.stub();

            console.log('✅ Ответ от сервера:', response);

            
        } catch (error) {
            console.error('❌ Ошибка соединения с сервером:', error);
            alert('Не удалось подключиться к серверу. Проверь, запущен ли бэкенд!');
            loginBtn.textContent = 'Войти';
            loginBtn.disabled = false;
        }
    });
}

export { setupLoginHandlers };