// js/handlers/loginRequestHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import grpcService from '../grpc/grpc-service.js';

let isRequesting = false;

export function setupLoginRequestHandlers() {
    console.log('🔧 setupLoginRequestHandlers вызвана');

    const emailInput = document.getElementById('email');
    const requestBtn = document.getElementById('request-code-btn');
    const errorDiv = document.getElementById('login-error');

    if (!requestBtn) {
        console.error('Кнопка запроса кода не найдена');
        return;
    }

    const clearError = () => {
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        if (emailInput) {
            emailInput.classList.remove('error');
        }
    };

    const showError = (message) => {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        if (emailInput) {
            emailInput.classList.add('error');
        }
    };

    const handleRequestCode = async () => {
        if (isRequesting) return;

        const email = emailInput?.value.trim() || '';

        if (!email) {
            showError('Введите email');
            emailInput?.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Введите корректный email');
            emailInput?.focus();
            return;
        }

        isRequesting = true;
        requestBtn.textContent = 'Отправка...';
        requestBtn.disabled = true;
        clearError();

        try {
            console.log('📡 Запрос кода на email:', email);
            const response = await grpcService.requestEmailCode(email);
            console.log('📨 Ответ сервера:', response);

            if (response.success) {
                localStorage.setItem('pendingEmail', email);
                await showScreen('loginVerify');
                
                const verifyEmailSpan = document.getElementById('verify-email');
                if (verifyEmailSpan) {
                    verifyEmailSpan.textContent = email;
                }
            } else {
                showError(response.error || 'Не удалось отправить код');
            }
        } catch (error) {
            console.error(' Ошибка:', error);
            showError('Ошибка соединения с сервером');
        } finally {
            isRequesting = false;
            requestBtn.textContent = 'Получить код';
            requestBtn.disabled = false;
        }
    };

    requestBtn.addEventListener('click', handleRequestCode);

    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleRequestCode();
        });
        emailInput.addEventListener('input', clearError);
    }
}