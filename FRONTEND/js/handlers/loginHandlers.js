// js/handlers/loginHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import grpcService from '../grpc/grpc-service.js';

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
            console.log('Email:', email);

            const response = await grpcService.login(email, password);

            console.log('✅ Ответ от сервера:', response);

            if (response.success) {
                state.isAuthenticated = true;
                state.token = response.token;
                state.currentUser = {
                    id: response.user.id,
                    email: response.user.email,
                    name: response.user.name || response.user.email.split('@')[0],
                    avatar_url: response.user.avatar_url
                };
                
                // ВАЖНО: НЕ выбираем чат автоматически
                state.currentChat = null;

                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(state.currentUser));

                console.log('👋 Привет,', state.currentUser.name);
                
                // Переходим в чат, но без выбранного чата
                showScreen('chat').then(() => {
                    // После загрузки чата, обновляем UI чтобы показать заглушку
                    import('../handlers/chat/index.js').then(module => {
                        if (module.updateChatAreaUI) {
                            module.updateChatAreaUI();
                        }
                    });
                });
            } else {
                alert('Ошибка входа: ' + (response.error || 'Неверный email или пароль'));
                loginBtn.textContent = 'Войти';
                loginBtn.disabled = false;
            }
        } catch (error) {
            console.error('❌ Ошибка соединения с сервером:', error);
            alert('Не удалось подключиться к серверу. Проверьте, запущен ли бэкенд!');
            loginBtn.textContent = 'Войти';
            loginBtn.disabled = false;
        }
    });
}

export { setupLoginHandlers };