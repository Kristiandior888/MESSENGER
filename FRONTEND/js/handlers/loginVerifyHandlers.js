// js/handlers/loginVerifyHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import grpcService from '../grpc/grpc-service.js';

let isVerifying = false;
let isInitialized = false;

export function setupLoginVerifyHandlers() {
    console.log('setupLoginVerifyHandlers вызвана');

    // Защита от повторного навешивания обработчиков
    if (isInitialized) {
        // Обновляем email, но обработчики не трогаем
        const emailSpan = document.getElementById('verify-email');
        const pendingEmail = localStorage.getItem('pendingEmail');
        if (emailSpan && pendingEmail) {
            emailSpan.textContent = pendingEmail;
        }
        return;
    }

    const codeInput = document.getElementById('verify-code');
    const verifyBtn = document.getElementById('verify-code-btn');
    const backBtn = document.getElementById('back-to-email-btn');
    const errorDiv = document.getElementById('verify-error');
    const emailSpan = document.getElementById('verify-email');

    if (!verifyBtn || !codeInput) {
        console.error('Элементы экрана верификации не найдены');
        return;
    }

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
        const email = localStorage.getItem('pendingEmail');

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

                localStorage.setItem('token', response.token);
                localStorage.setItem('userData', JSON.stringify(state.currentUser));
                localStorage.removeItem('pendingEmail');

                console.log('Добро пожаловать,', state.currentUser.name);

                const { resetChatInitialization } = await import('./chat/index.js');
                resetChatInitialization();

                await showScreen('chat');
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
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
        } finally {
            isVerifying = false;
            verifyBtn.textContent = 'Войти';
            verifyBtn.disabled = false;
        }
    };

    const handleBack = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log('🔙 Возврат к вводу email');

        localStorage.removeItem('pendingEmail');
        if (codeInput) codeInput.value = '';
        clearError();

        try {
            const { resetChatInitialization } = await import('./chat/index.js');
            resetChatInitialization();
        } catch (err) {
            console.warn('Не удалось сбросить инициализацию чата:', err);
        }

        await showScreen('loginRequest');
    };

    // Убираем старые обработчики через replaceChild, чтобы не было дублей
    const newVerifyBtn = verifyBtn.cloneNode(true);
    verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);

    if (backBtn) {
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.addEventListener('click', handleBack);
    }

    newVerifyBtn.addEventListener('click', handleVerify);

    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleVerify();
        }
    });
    codeInput.addEventListener('input', clearError);

    isInitialized = true;
    console.log('✅ Обработчики верификации настроены');
}