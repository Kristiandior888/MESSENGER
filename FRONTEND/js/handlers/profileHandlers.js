// js/handlers/profileHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { saveAvatarToStorage, updateAllAvatars, fileToDataURL } from '../utils/avatarUtils.js';
import { THEMES, saveTheme, applyTheme, updateThemeSwitcherUI, getCurrentTheme, initTheme } from '../utils/themeUtils.js';
import { showCreateGroupModal } from './groups/index.js';

// НАСТРОЙКА СТРАНИЦЫ ПРОФИЛЯ
function setupProfileHandlers() {
    console.log('Страница профиля загружена');
    
    // Заполняем информацию о пользователе
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileAvatar = document.getElementById('profile-avatar');
    
    if (profileName && state.currentUser) {
        profileName.textContent = state.currentUser.name;
    }
    
    if (profileEmail && state.currentUser) {
        profileEmail.textContent = state.currentUser.email;
    }
    
    // Загружаем сохраненный аватар
    if (profileAvatar) {
        if (state.userAvatar) {
            profileAvatar.src = state.userAvatar;
        } else {
            const savedAvatar = localStorage.getItem('userAvatar');
            if (savedAvatar) {
                state.userAvatar = savedAvatar;
                profileAvatar.src = savedAvatar;
                updateAllAvatars(savedAvatar);
            }
        }
    }
    
    // НАСТРАИВАЕМ ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (БЕЗ ПЕРЕЗАГРУЗКИ)
    const darkThemeOption = document.getElementById('theme-dark');
    const lightThemeOption = document.getElementById('theme-light');
    
    // Обновляем UI переключателя в соответствии с текущей темой
    updateThemeSwitcherUI();
    
    if (darkThemeOption) {
        const newDarkOption = darkThemeOption.cloneNode(true);
        darkThemeOption.parentNode.replaceChild(newDarkOption, darkThemeOption);
        
        newDarkOption.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Переключение на темную тему (без перезагрузки)');
            
            // Сохраняем тему
            saveTheme(THEMES.DARK);
            
            // Применяем тему без перезагрузки
            applyThemeWithoutReload(THEMES.DARK);
            
            // Обновляем активный класс в переключателе
            updateThemeSwitcherUI();
        });
    }
    
    if (lightThemeOption) {
        const newLightOption = lightThemeOption.cloneNode(true);
        lightThemeOption.parentNode.replaceChild(newLightOption, lightThemeOption);
        
        newLightOption.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Переключение на светлую тему (без перезагрузки)');
            
            // Сохраняем тему
            saveTheme(THEMES.LIGHT);
            
            // Применяем тему без перезагрузки
            applyThemeWithoutReload(THEMES.LIGHT);
            
            // Обновляем активный класс в переключателе
            updateThemeSwitcherUI();
        });
    }
    
    // НАСТРАИВАЕМ ЗАГРУЗКУ АВАТАРА
    const avatarContainer = document.querySelector('.current-avatar');
    const avatarUpload = document.getElementById('avatar-upload');
    
    if (avatarContainer && avatarUpload) {
        const newAvatarContainer = avatarContainer.cloneNode(true);
        avatarContainer.parentNode.replaceChild(newAvatarContainer, avatarContainer);
        
        newAvatarContainer.addEventListener('click', () => {
            avatarUpload.click();
        });
        
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 2 * 1024 * 1024) {
                alert('Файл слишком большой. Максимальный размер - 2MB');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                alert('Пожалуйста, выберите изображение');
                return;
            }
            
            try {
                const imageData = await fileToDataURL(file);
                state.userAvatar = imageData;
                saveAvatarToStorage(imageData);
                updateAllAvatars(imageData);
                
                const profileAvatarEl = document.getElementById('profile-avatar');
                if (profileAvatarEl) {
                    profileAvatarEl.src = imageData;
                }
                
                console.log('Аватар успешно обновлен');
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
                alert('Не удалось загрузить изображение');
            }
        });
    }
    
    // НАСТРАИВАЕМ КНОПКУ НАСТРОЕК
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        const newSettingsBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
        
        newSettingsBtn.addEventListener('click', () => {
            showScreen('settings');
        });
    }
    
    // НАСТРАИВАЕМ КНОПКУ "СОЗДАТЬ ГРУППУ"
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        const newCreateGroupBtn = createGroupBtn.cloneNode(true);
        createGroupBtn.parentNode.replaceChild(newCreateGroupBtn, createGroupBtn);
        
        newCreateGroupBtn.addEventListener('click', () => {
            showCreateGroupModal();
        });
    }
    
    // НАСТРАИВАЕМ КНОПКУ "ВЫЙТИ"
    const logoutProfileBtn = document.getElementById('logout-profile-btn');
    if (logoutProfileBtn) {
        const newLogoutBtn = logoutProfileBtn.cloneNode(true);
        logoutProfileBtn.parentNode.replaceChild(newLogoutBtn, logoutProfileBtn);
        
        newLogoutBtn.addEventListener('click', () => {
            console.log('🚪 Выход из системы через профиль');
            
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            localStorage.removeItem('userAvatar');
            
            state.isAuthenticated = false;
            state.currentUser = null;
            state.token = null;
            state.currentChat = null;
            state.userAvatar = null;
            state.chats = [];
            
            showScreen('loginRequest');
        });
    }
    
    // НАСТРАИВАЕМ КНОПКУ ЗАКРЫТИЯ
    const closeBtn = document.getElementById('close-profile-btn');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', async () => {
            console.log('🔙 Возврат из профиля в чат');
            
            const { loadChatsFromServer } = await import('./chat/chat-core.js');
            const { resetChatInitialization } = await import('./chat/index.js');
            
            resetChatInitialization();
            await loadChatsFromServer();
            showScreen('chat');
        });
    }
}

// Функция для применения темы без перезагрузки страницы
function applyThemeWithoutReload(theme) {
    const linkElement = document.getElementById('theme-style');
    const isLight = theme === THEMES.LIGHT;
    
    // Меняем CSS файл
    if (linkElement) {
        if (isLight) {
            linkElement.href = 'style-light.css';
        } else {
            linkElement.href = 'style.css';
        }
    }
    
    // Обновляем класс на body для дополнительных стилей
    if (isLight) {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
    
    // Обновляем цвета для существующих элементов (чтобы не ждать загрузки CSS)
    updateElementColors(isLight);
    
    console.log(`✅ Тема применена: ${theme}`);
}

// Обновление цветов существующих элементов
function updateElementColors(isLight) {
    // Обновляем фон body
    document.body.style.backgroundColor = isLight ? '#fefaf5' : '#1a1e24';
    
    // Обновляем фон контейнера чата
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.style.backgroundColor = isLight ? '#fefaf5' : '#1e242b';
    }
    
    // Обновляем боковую панель
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.background = isLight 
            ? 'linear-gradient(135deg, #fff5ed 0%, #fef0e6 40%, #fdeadd 100%)'
            : '#252b33';
    }
    
    // Обновляем фон области чата
    const chatArea = document.querySelector('.chat-area');
    if (chatArea) {
        chatArea.style.backgroundColor = isLight ? '#fefaf5' : '#1a1e24';
    }
    
    // Обновляем панель ввода
    const messageInput = document.querySelector('.message-input');
    if (messageInput) {
        messageInput.style.backgroundColor = isLight ? '#fffbf7' : '#252b33';
        messageInput.style.borderTopColor = isLight ? '#efe3d4' : '#3a424c';
    }
    
    // Обновляем поле ввода
    const messageField = document.getElementById('message-field');
    if (messageField) {
        messageField.style.backgroundColor = isLight ? '#f0ece4' : '#2a2f38';
        messageField.style.color = isLight ? '#3a2c21' : '#ffffff';
        messageField.style.borderColor = isLight ? '#e3d4c2' : '#3a424c';
    }
    
    // Обновляем кнопки
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.style.color = isLight ? '#c17b3a' : '#d4af37';
        sendBtn.style.borderColor = isLight ? '#c17b3a' : '#d4af37';
    }
    
    const attachBtn = document.querySelector('.attach-btn');
    if (attachBtn) {
        attachBtn.style.color = isLight ? '#7a684e' : '#a0a8b4';
        attachBtn.style.borderColor = isLight ? '#e3d4c2' : '#3a424c';
    }
    
    const emojiBtn = document.querySelector('.emoji-btn');
    if (emojiBtn) {
        emojiBtn.style.color = isLight ? '#7a684e' : '#a0a8b4';
        emojiBtn.style.borderColor = isLight ? '#e3d4c2' : '#3a424c';
    }
    
    // Обновляем сообщения
    document.querySelectorAll('.message.sent').forEach(msg => {
        msg.style.background = isLight 
            ? 'linear-gradient(115deg, #feeadc 0%, #fde5d4 40%, #fcdfcb 70%, #fbd9c2 100%)'
            : 'linear-gradient(135deg, #3a424c 0%, #2d343c 100%)';
        msg.style.color = isLight ? '#3a2c21' : '#ffffff';
        msg.style.border = isLight ? '1px solid #e3d4c2' : '1px solid #4a535f';
    });
    
    document.querySelectorAll('.message.received').forEach(msg => {
        msg.style.background = isLight ? '#ffffff' : '#2d343c';
        msg.style.color = isLight ? '#3a2c21' : '#e0e0e0';
        msg.style.border = isLight ? '1px solid #efe3d4' : 'none';
    });
    
    // Обновляем элементы чата в списке
    document.querySelectorAll('.chat-item').forEach(item => {
        item.style.color = isLight ? '#7a684e' : '#d0d8e2';
        if (item.classList.contains('active')) {
            item.style.background = isLight ? '#fef4e8' : '#2d363f';
            item.style.color = isLight ? '#c17b3a' : '#ffffff';
        } else {
            item.style.background = isLight ? 'transparent' : 'transparent';
        }
    });
    
    // Обновляем информацию о пользователе
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.style.background = isLight 
            ? 'linear-gradient(95deg, #fff8f0 0%, #fef2e7 50%, #fdecde 100%)'
            : '#252b33';
        userInfo.style.borderBottomColor = isLight ? '#efe3d4' : '#3a424c';
    }
    
    // Обновляем скроллбары (через CSS переменные)
    const root = document.documentElement;
    if (isLight) {
        root.style.setProperty('--scrollbar-track', '#fefaf5');
        root.style.setProperty('--scrollbar-thumb', '#decbaa');
        root.style.setProperty('--scrollbar-thumb-hover', '#c17b3a');
    } else {
        root.style.setProperty('--scrollbar-track', '#252b33');
        root.style.setProperty('--scrollbar-thumb', '#4a535f');
        root.style.setProperty('--scrollbar-thumb-hover', '#d4af37');
    }
}

export { setupProfileHandlers };