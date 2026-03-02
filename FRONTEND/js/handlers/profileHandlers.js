import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { saveAvatarToStorage, updateAllAvatars, fileToDataURL } from '../utils/avatarUtils.js';

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
        // Сначала проверяем в состоянии
        if (state.userAvatar) {
            profileAvatar.src = state.userAvatar;
        } 
        // Потом проверяем в localStorage
        else {
            const savedAvatar = localStorage.getItem('userAvatar');
            if (savedAvatar) {
                state.userAvatar = savedAvatar;
                profileAvatar.src = savedAvatar;
                updateAllAvatars(savedAvatar);
            }
        }
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
            
            // Проверяем размер файла (макс 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Файл слишком большой. Максимальный размер - 2MB');
                return;
            }
            
            // Проверяем тип файла
            if (!file.type.startsWith('image/')) {
                alert('Пожалуйста, выберите изображение');
                return;
            }
            
            try {
                // Конвертируем в Data URL
                const imageData = await fileToDataURL(file);
                
                // Сохраняем в состояние
                state.userAvatar = imageData;
                
                // Сохраняем в localStorage
                saveAvatarToStorage(imageData);
                
                // Обновляем все аватары
                updateAllAvatars(imageData);
                
                console.log('Аватар успешно обновлен');
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
                alert('Не удалось загрузить изображение');
            }
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