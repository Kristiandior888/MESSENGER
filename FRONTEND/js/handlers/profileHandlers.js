// js/handlers/profileHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { saveAvatarToStorage, updateAllAvatars, fileToDataURL } from '../utils/avatarUtils.js';
import { THEMES, saveTheme, updateThemeSwitcherUI } from '../utils/themeUtils.js';
import { showCreateGroupModal } from './groups/index.js';

function setupProfileHandlers() {
    console.log('Страница профиля загружена');

    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileAvatar = document.getElementById('profile-avatar');

    if (profileName && state.currentUser) {
        profileName.textContent = state.currentUser.name;
    }
    if (profileEmail && state.currentUser) {
        profileEmail.textContent = state.currentUser.email;
    }

    // Аватар
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

    // Переключатель темы
    const darkThemeOption = document.getElementById('theme-dark');
    const lightThemeOption = document.getElementById('theme-light');

    updateThemeSwitcherUI();

    if (darkThemeOption) {
        const newDarkOption = darkThemeOption.cloneNode(true);
        darkThemeOption.parentNode.replaceChild(newDarkOption, darkThemeOption);

        newDarkOption.addEventListener('click', (e) => {
            e.preventDefault();
            saveTheme(THEMES.DARK);
            applyThemeWithoutReload(THEMES.DARK);
            updateThemeSwitcherUI();
        });
    }

    if (lightThemeOption) {
        const newLightOption = lightThemeOption.cloneNode(true);
        lightThemeOption.parentNode.replaceChild(newLightOption, lightThemeOption);

        newLightOption.addEventListener('click', (e) => {
            e.preventDefault();
            saveTheme(THEMES.LIGHT);
            applyThemeWithoutReload(THEMES.LIGHT);
            updateThemeSwitcherUI();
        });
    }

    // Загрузка аватара
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
                if (profileAvatarEl) profileAvatarEl.src = imageData;

                console.log('Аватар успешно обновлен');
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
                alert('Не удалось загрузить изображение');
            }
        });
    }

    // Кнопка настроек
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        const newSettingsBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
        newSettingsBtn.addEventListener('click', () => showScreen('settings'));
    }

    // Кнопка «Создать группу»
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        const newCreateGroupBtn = createGroupBtn.cloneNode(true);
        createGroupBtn.parentNode.replaceChild(newCreateGroupBtn, createGroupBtn);
        newCreateGroupBtn.addEventListener('click', () => showCreateGroupModal());
    }

    // Кнопка «Выйти»
    const logoutProfileBtn = document.getElementById('logout-profile-btn');
    if (logoutProfileBtn) {
        const newLogoutBtn = logoutProfileBtn.cloneNode(true);
        logoutProfileBtn.parentNode.replaceChild(newLogoutBtn, logoutProfileBtn);

        newLogoutBtn.addEventListener('click', async () => {
            console.log('🚪 Выход из системы через профиль');

            const { stopGlobalMessageStream } = await import('./chat/chat-messages.js');
            await stopGlobalMessageStream();

            const { resetChatInitialization } = await import('./chat/index.js');
            resetChatInitialization();

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

    // Кнопка закрытия
    const closeBtn = document.getElementById('close-profile-btn');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', async () => {
            console.log('🔙 Возврат из профиля в чат');
            await showScreen('chat');
        });
    }
}

// Просто меняем href CSS — цвета берутся из файла темы
function applyThemeWithoutReload(theme) {
    const linkElement = document.getElementById('theme-style');
    const isLight = theme === THEMES.LIGHT;

    if (linkElement) {
        linkElement.href = isLight ? 'style-light.css' : 'style.css';
    }

    document.body.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('dark-theme', !isLight);

    console.log(`✅ Тема применена: ${theme}`);
}

export { setupProfileHandlers };