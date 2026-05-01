// js/handlers/loginVerifyHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import grpcService from '../grpc/grpc-service.js';

let isVerifying = false;

export function setupLoginVerifyHandlers() {
    console.log('setupLoginVerifyHandlers вызвана');

    const codeInput = document.getElementById('verify-code');
    const verifyBtn = document.getElementById('verify-code-btn');
    const backBtn = document.getElementById('back-to-email-btn');
    const errorDiv = document.getElementById('verify-error');
    const emailSpan = document.getElementById('verify-email');

    // Загружаем email из localStorage
    const pendingEmail = localStorage.getItem('pendingEmail');
    if (emailSpan && pendingEmail) {
        emailSpan.textContent = pendingEmail;
    }

    const clearError = () => {
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        if (codeInput) {
            codeInput.classList.remove('error');
        }
    };

    const showError = (message) => {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        if (codeInput) {
            codeInput.classList.add('error');
        }
    };

    const handleVerify = async () => {
        if (isVerifying) return;

        const code = codeInput?.value.trim() || '';
        const email = pendingEmail;

        if (!email) {
            showError('Email не найден. Попробуйте начать заново.');
            return;
        }

        if (!code || code.length < 4) {
            showError('Введите код из письма');
            codeInput?.focus();
            return;
        }

        isVerifying = true;
        verifyBtn.textContent = 'Проверка...';
        verifyBtn.disabled = true;
        clearError();

        try {
            console.log('📡 Проверка кода для:', email);
            const response = await grpcService.verifyEmailCode(email, code);

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
                
                state.currentChat = null;

                // Сохраняем в localStorage
                localStorage.setItem('token', response.token);
                localStorage.setItem('userData', JSON.stringify(state.currentUser));
                localStorage.removeItem('pendingEmail'); // Очищаем временные данные

                console.log('Добро пожаловать,', state.currentUser.name);
                
                // Переходим в чат
                await showScreen('chat');
                
                // Обновляем UI чата
                const chatModule = await import('../handlers/chat/index.js');
                if (chatModule.updateChatAreaUI) {
                    chatModule.updateChatAreaUI();
                }
            } else {
                showError(response.error || 'Неверный код подтверждения');
                if (codeInput) {
                    codeInput.value = '';
                    codeInput.focus();
                }
            }
        } catch (error) {
            console.error('Ошибка проверки кода:', error);
            showError('Ошибка соединения с сервером');
        } finally {
            isVerifying = false;
            verifyBtn.textContent = 'Войти';
            verifyBtn.disabled = false;
        }
    };

    const handleBack = async () => {
        // Очищаем временные данные
        localStorage.removeItem('pendingEmail');
        if (codeInput) codeInput.value = '';
        await showScreen('loginRequest');
    };

    verifyBtn?.addEventListener('click', handleVerify);
    backBtn?.addEventListener('click', handleBack);

    if (codeInput) {
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleVerify();
            }
        });
        codeInput.addEventListener('input', clearError);
    }
}