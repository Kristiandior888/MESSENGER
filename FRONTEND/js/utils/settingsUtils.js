// Настройки по умолчанию
const DEFAULT_SETTINGS = {
    fontSize: 14,
    soundNotifications: true,
    popupNotifications: true,
    showTime: true,
    compactMode: false
};

// Текущие настройки (временные, пока не применены)
let pendingSettings = { ...DEFAULT_SETTINGS };

// Загрузить настройки из localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('app_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            pendingSettings = { ...DEFAULT_SETTINGS, ...parsed };
            return { ...pendingSettings };
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
    pendingSettings = { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS };
}

// Сохранить настройки в localStorage
function saveSettings(settings) {
    try {
        localStorage.setItem('app_settings', JSON.stringify(settings));
        console.log('Настройки сохранены:', settings);
        return true;
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        return false;
    }
}

// Применить размер шрифта ко всем сообщениям
function applyFontSize(size) {
    // Устанавливаем CSS переменную
    document.documentElement.style.setProperty('--message-font-size', size + 'px');
    
    // Применяем к контейнеру сообщений
    const messages = document.getElementById('messages');
    if (messages) {
        messages.style.fontSize = size + 'px';
    }
    
    // Применяем ко всем существующим сообщениям
    document.querySelectorAll('.message .text').forEach(el => {
        el.style.fontSize = size + 'px';
    });
    
    // Применяем к смайликам (они наследуют размер шрифта)
    document.querySelectorAll('.message .text img, .emoji').forEach(el => {
        el.style.width = (size + 4) + 'px';
        el.style.height = (size + 4) + 'px';
    });
    
    console.log(`Размер шрифта изменен на ${size}px`);
}

// Применить компактный режим
function applyCompactMode(enabled) {
    if (enabled) {
        document.body.classList.add('compact-mode');
        // Уменьшаем отступы между сообщениями
        document.querySelectorAll('.message').forEach(el => {
            el.style.marginBottom = '5px';
            el.style.padding = '8px 12px';
        });
    } else {
        document.body.classList.remove('compact-mode');
        // Возвращаем стандартные отступы
        document.querySelectorAll('.message').forEach(el => {
            el.style.marginBottom = '';
            el.style.padding = '';
        });
    }
}

// Применить показ времени
function applyShowTime(enabled) {
    document.querySelectorAll('.time').forEach(el => {
        el.style.display = enabled ? 'inline' : 'none';
    });
}

// Применить все настройки из pendingSettings
function applyPendingSettings() {
    applyFontSize(pendingSettings.fontSize);
    applyCompactMode(pendingSettings.compactMode);
    applyShowTime(pendingSettings.showTime);
    
    // Сохраняем в localStorage
    saveSettings(pendingSettings);
    
    console.log('Все настройки применены:', pendingSettings);
}

// Получить текущие настройки (временные)
function getPendingSettings() {
    return { ...pendingSettings };
}

// Обновить временные настройки
function updatePendingSettings(newSettings) {
    pendingSettings = { ...pendingSettings, ...newSettings };
}

// Применить все настройки при загрузке
function applyAllSettings() {
    const settings = loadSettings(); // загружает в pendingSettings
    applyFontSize(settings.fontSize);
    applyCompactMode(settings.compactMode);
    applyShowTime(settings.showTime);
    return settings;
}

export { 
    loadSettings, 
    saveSettings, 
    applyFontSize, 
    applyAllSettings, 
    applyPendingSettings,
    getPendingSettings,
    updatePendingSettings,
    DEFAULT_SETTINGS 
};