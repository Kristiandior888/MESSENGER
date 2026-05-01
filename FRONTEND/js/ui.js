// js/ui.js

// Хранилище всех экранов
const screens = {
    loginRequest: null,
    loginVerify: null,
    chat: null,
    profile: null,
    settings: null
};

let isInitialized = false;

// Загрузка одной страницы
async function loadPage(url) {
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        console.error('Ошибка загрузки страницы:', error);
        return '<div style="color: red; padding: 20px;">Ошибка загрузки</div>';
    }
}

// Инициализация всех экранов при старте
export async function initScreens() {
    if (isInitialized) return;
    
    console.log('Инициализация всех экранов...');
    
    const content = document.getElementById('content');
    if (!content) return;
    
    // Загружаем все страницы
    const [loginRequestHtml, loginVerifyHtml, chatHtml, profileHtml, settingsHtml] = await Promise.all([
        loadPage('pages/login-request.html'),
        loadPage('pages/login-verify.html'),
        loadPage('pages/chat.html'),
        loadPage('pages/profile.html'),
        loadPage('pages/settings.html')
    ]);
    
    // Создаём экран запроса email
    screens.loginRequest = document.createElement('div');
    screens.loginRequest.id = 'screen-login-request';
    screens.loginRequest.className = 'screen';
    screens.loginRequest.innerHTML = loginRequestHtml;
    
    // Создаём экран подтверждения кода
    screens.loginVerify = document.createElement('div');
    screens.loginVerify.id = 'screen-login-verify';
    screens.loginVerify.className = 'screen';
    screens.loginVerify.innerHTML = loginVerifyHtml;
    
    // Создаём экран чата
    screens.chat = document.createElement('div');
    screens.chat.id = 'screen-chat';
    screens.chat.className = 'screen';
    screens.chat.innerHTML = chatHtml;
    
    // Создаём экран профиля
    screens.profile = document.createElement('div');
    screens.profile.id = 'screen-profile';
    screens.profile.className = 'screen';
    screens.profile.innerHTML = profileHtml;
    
    // Создаём экран настроек
    screens.settings = document.createElement('div');
    screens.settings.id = 'screen-settings';
    screens.settings.className = 'screen';
    screens.settings.innerHTML = settingsHtml;
    
    // Добавляем все экраны в DOM
    content.appendChild(screens.loginRequest);
    content.appendChild(screens.loginVerify);
    content.appendChild(screens.chat);
    content.appendChild(screens.profile);
    content.appendChild(screens.settings);
    
    // Скрываем все экраны
    hideAllScreens();
    
    isInitialized = true;
    console.log('✅ Все экраны инициализированы');
}

// Скрыть все экраны
function hideAllScreens() {
    Object.values(screens).forEach(screen => {
        if (screen) screen.style.display = 'none';
    });
}

// Показать нужный экран
export async function showScreen(screenName) {
    console.log('📺 Показ экрана:', screenName);
    
    if (!isInitialized) {
        await initScreens();
    }
    
    // Скрываем все экраны
    hideAllScreens();
    
    // Показываем нужный экран
    const targetScreen = screens[screenName];
    if (targetScreen) {
        targetScreen.style.display = 'block';
        
        // Вызываем соответствующие обработчики
        if (screenName === 'chat') {
            const chatModule = await import('./handlers/chat/index.js');
            await chatModule.setupChatHandlers();
        } else if (screenName === 'loginRequest') {
            const { setupLoginRequestHandlers } = await import('./handlers/loginRequestHandlers.js');
            setupLoginRequestHandlers();
        } else if (screenName === 'loginVerify') {
            const { setupLoginVerifyHandlers } = await import('./handlers/loginVerifyHandlers.js');
            setupLoginVerifyHandlers();
        } else if (screenName === 'profile') {
            const { setupProfileHandlers } = await import('./handlers/profileHandlers.js');
            setupProfileHandlers();
        } else if (screenName === 'settings') {
            const { setupSettingsHandlers } = await import('./handlers/settingsHandlers.js');
            setupSettingsHandlers();
        }
    } else {
        console.error('❌ Экран не найден:', screenName);
    }
}

// Получить DOM элемент экрана
export function getScreen(screenName) {
    return screens[screenName];
}

// Добавляем CSS для экранов
const style = document.createElement('style');
style.textContent = `
    .screen {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background: var(--bg-color, #1e242b);
        overflow: hidden;
    }
`;
document.head.appendChild(style);