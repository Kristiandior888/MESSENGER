import { state } from '../app.js';
import { showScreen } from '../ui.js';

// НАСТРОЙКА ЭКРАНА ВХОДА
function setupLoginHandlers() {
    console.log('setupLoginHandlers вызвана');
    
    const loginBtn = document.getElementById('login-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Клик по кнопке входа!');
            
            loginBtn.textContent = 'Вход...';
            loginBtn.disabled = true;

            setTimeout(() => {
                console.log('Таймер сработал!');
                

                state.isAuthenticated = true;
                state.currentUser = {
                    email: 'kris@company.com',
                    name: 'Кристина Хабло'
                };

                console.log('Пользователь установлен:', state.currentUser);
                showScreen('chat');
            }, 1000);
        });
    }
}

export { setupLoginHandlers };