// js/handlers/profileHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { saveAvatarToStorage, updateAllAvatars, fileToDataURL } from '../utils/avatarUtils.js';
import { THEMES, applyTheme, saveTheme, updateThemeSwitcherUI } from '../utils/themeUtils.js';
import { showCreateGroupModal } from './groupHandlers.js';

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
    
    // НАСТРАИВАЕМ ПЕРЕКЛЮЧЕНИЕ ТЕМЫ
    const darkThemeOption = document.getElementById('theme-dark');
    const lightThemeOption = document.getElementById('theme-light');
    
    updateThemeSwitcherUI();
    
    if (darkThemeOption) {
        const newDarkOption = darkThemeOption.cloneNode(true);
        darkThemeOption.parentNode.replaceChild(newDarkOption, darkThemeOption);
        
        newDarkOption.addEventListener('click', () => {
            console.log('🌙 Переключение на темную тему');
            
            // Сохраняем тему
            saveTheme(THEMES.DARK);
            
            // Перезагружаем приложение
            window.location.reload();
        });
    }
    
    if (lightThemeOption) {
        const newLightOption = lightThemeOption.cloneNode(true);
        lightThemeOption.parentNode.replaceChild(newLightOption, lightThemeOption);
        
        newLightOption.addEventListener('click', () => {
            console.log('☀️ Переключение на светлую тему');
            
            // Сохраняем тему
            saveTheme(THEMES.LIGHT);
            
            // Перезагружаем приложение
            window.location.reload();
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
            
            // Очищаем localStorage от данных сессии
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            
            // Сбрасываем состояние
            state.isAuthenticated = false;
            state.currentUser = null;
            state.token = null;
            state.currentChat = null;
            state.userAvatar = null;
            state.chats = [];
            
            // Показываем экран входа
            showScreen('login');
        });
    }
    
    // НАСТРАИВАЕМ КНОПКУ ЗАКРЫТИЯ
    const closeBtn = document.getElementById('close-profile-btn');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', () => {
            showScreen('chat');
        });
    }
}

export { setupProfileHandlers };