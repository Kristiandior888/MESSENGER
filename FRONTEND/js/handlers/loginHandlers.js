/*
// js/handlers/loginHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import grpcService from '../grpc/grpc-service.js';

// Флаг для предотвращения множественных запросов
let isLoggingIn = false;

function setupLoginHandlers() {
    console.log('setupLoginHandlers вызвана');

    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!loginBtn) {
        console.error('Кнопка логина не найдена');
        return;
    }

    // Удаляем старые обработчики (если были)
    const newLoginBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode?.replaceChild(newLoginBtn, loginBtn);

    // Функция сброса состояния кнопки
    const resetLoginButton = () => {
        newLoginBtn.textContent = 'Войти';
        newLoginBtn.disabled = false;
        isLoggingIn = false;
    };

    // Функция очистки полей от предыдущих ошибок
    const clearErrors = () => {
        [emailInput, passwordInput].forEach(input => {
            if (input) {
                input.classList.remove('error');
                input.style.borderColor = '';
            }
        });
        
        // Удаляем сообщение об ошибке, если есть
        const existingError = document.querySelector('.login-error');
        if (existingError) existingError.remove();
    };

    // Функция показа ошибки
    const showError = (message) => {
        clearErrors();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'login-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #e05a5a;
            background: rgba(224, 90, 90, 0.1);
            padding: 10px 20px;
            border-radius: 8px;
            margin-top: 15px;
            font-size: 14px;
            text-align: center;
            border: 1px solid rgba(224, 90, 90, 0.3);
        `;
        
        const loginContainer = document.querySelector('.login-container');
        const form = loginContainer?.querySelector('div');
        if (form) {
            form.appendChild(errorDiv);
        }
        
        // Подсвечиваем поля
        if (emailInput && !emailInput.value.trim()) {
            emailInput.classList.add('error');
            emailInput.style.borderColor = '#e05a5a';
        }
        if (passwordInput && !passwordInput.value.trim()) {
            passwordInput.classList.add('error');
            passwordInput.style.borderColor = '#e05a5a';
        }
    };

    // Основная функция входа
    const handleLogin = async () => {
        // Защита от повторного нажатия
        if (isLoggingIn) {
            console.log('Вход уже выполняется, подождите...');
            return;
        }

        const email = emailInput?.value.trim() || '';
        const password = passwordInput?.value.trim() || '';

        // Валидация
        if (!email) {
            showError('Введите email');
            emailInput?.focus();
            return;
        }

        if (!password) {
            showError('Введите пароль');
            passwordInput?.focus();
            return;
        }

        // Блокируем кнопку
        isLoggingIn = true;
        newLoginBtn.textContent = 'Вход...';
        newLoginBtn.disabled = true;
        
        // Очищаем предыдущие ошибки
        clearErrors();

        try {
            console.log('📡 Отправка запроса на сервер...');
            console.log('Email:', email);

            const response = await grpcService.login(email, password);
            console.log('📨 Ответ от сервера:', response);

            if (response.success && response.user) {
                // Успешный вход
                state.isAuthenticated = true;
                state.token = response.token;
                state.currentUser = {
                    id: response.user.id,
                    email: response.user.email,
                    name: response.user.name || response.user.email.split('@')[0],
                    avatar_url: response.user.avatar_url
                };
                
                // Сбрасываем текущий чат
                state.currentChat = null;

                // Сохраняем в localStorage
                localStorage.setItem('token', response.token);
                localStorage.setItem('userData', JSON.stringify(state.currentUser));

                console.log('✅ Добро пожаловать,', state.currentUser.name);
                
                // Переходим в чат
                await showScreen('chat');
                
                // Обновляем UI чата
                const chatModule = await import('../handlers/chat/index.js');
                if (chatModule.updateChatAreaUI) {
                    chatModule.updateChatAreaUI();
                }
            } else {
                // Неудачный вход - показываем ошибку
                const errorMsg = response.error || 'Неверный email или пароль';
                showError(errorMsg);
                
                // Очищаем пароль для повторной попытки
                if (passwordInput) {
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            }
        } catch (error) {
            console.error('❌ Ошибка соединения с сервером:', error);
            showError('Не удалось подключиться к серверу. Проверьте, запущен ли бэкенд!');
        } finally {
            // Разблокируем кнопку (только при ошибке, при успехе не надо)
            if (!state.isAuthenticated) {
                resetLoginButton();
            }
        }
    };

    // Добавляем обработчик клика
    newLoginBtn.addEventListener('click', handleLogin);

    // Добавляем обработчик Enter на поля ввода
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    };

    if (emailInput) {
        emailInput.addEventListener('keypress', handleKeyPress);
        // Убираем подсветку ошибки при вводе
        emailInput.addEventListener('input', () => {
            emailInput.classList.remove('error');
            emailInput.style.borderColor = '';
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', handleKeyPress);
        // Убираем подсветку ошибки при вводе
        passwordInput.addEventListener('input', () => {
            passwordInput.classList.remove('error');
            passwordInput.style.borderColor = '';
        });
    }

    // Функция для ручного сброса (если нужно извне)
    window.resetLoginForm = resetLoginButton;
}

export { setupLoginHandlers };

*/