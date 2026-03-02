// Работа с аватарками

// Сохраняет аватарку в localStorage (временное решение)
function saveAvatarToStorage(imageData) {
    try {
        localStorage.setItem('userAvatar', imageData);
        console.log('Аватар сохранен в localStorage');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения аватара:', error);
        return false;
    }
}

// Загружает аватарку из localStorage
function loadAvatarFromStorage() {
    try {
        const avatar = localStorage.getItem('userAvatar');
        return avatar || null;
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        return null;
    }
}

// Обновляет аватарки на всех страницах
function updateAllAvatars(imageData) {
    // Обновляем в боковой панели чата
    const chatAvatar = document.querySelector('.avatar');
    if (chatAvatar) {
        chatAvatar.src = imageData;
    }
    
    // Обновляем на странице профиля
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) {
        profileAvatar.src = imageData;
    }
}

// Конвертирует файл в Data URL (для отображения)
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

export { saveAvatarToStorage, loadAvatarFromStorage, updateAllAvatars, fileToDataURL };