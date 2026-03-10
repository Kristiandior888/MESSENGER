import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { saveAvatarToStorage, updateAllAvatars, fileToDataURL } from '../utils/avatarUtils.js';
import { THEMES, applyTheme, saveTheme, getCurrentTheme, updateThemeSwitcherUI } from '../utils/themeUtils.js';
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
    
    // Обновляем UI переключателя в соответствии с текущей темой
    updateThemeSwitcherUI();
    
    if (darkThemeOption) {
        darkThemeOption.addEventListener('click', () => {
            applyTheme(THEMES.DARK);
            saveTheme(THEMES.DARK);
            updateThemeSwitcherUI();
        });
    }
    
    if (lightThemeOption) {
        lightThemeOption.addEventListener('click', () => {
            applyTheme(THEMES.LIGHT);
            saveTheme(THEMES.LIGHT);
            updateThemeSwitcherUI();
        });
    }
    
    // НАСТРАИВАЕМ ЗАГРУЗКУ АВАТАРА
    const avatarContainer = document.querySelector('.current-avatar');
    const avatarUpload = document.getElementById('avatar-upload');
    
    if (avatarContainer && avatarUpload) {
        avatarContainer.addEventListener('click', () => {
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
                
                if (profileAvatar) {
                    profileAvatar.src = imageData;
                }
                
                console.log('Аватар успешно обновлен');
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
                alert('Не удалось загрузить изображение');
            }
        });
    }

    // НАСТРАИВАЕМ КНОПКУ "СОЗДАТЬ ГРУППУ"
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', () => {
            showCreateGroupModal();
        });
    }
    
    // НАСТРАИВАЕМ КНОПКУ "ВЫЙТИ" В ПРОФИЛЕ
    const logoutProfileBtn = document.getElementById('logout-profile-btn');
    if (logoutProfileBtn) {
        logoutProfileBtn.addEventListener('click', () => {
            console.log('Выход из системы через профиль');
            
            // Сбрасываем состояние авторизации
            state.isAuthenticated = false;
            state.currentUser = null;
            
            // Возвращаемся на экран логина
            showScreen('login');
        });
    }

    // НАСТРАИВАЕМ КНОПКУ ЗАКРЫТИЯ
    const closeBtn = document.getElementById('close-profile-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            showScreen('chat');
        });
    }
}

export { setupProfileHandlers };