// js/utils/settingsUtils.js

const DEFAULT_SETTINGS = {
    fontSize: 14,
    soundNotifications: true,
    popupNotifications: true,
    showTime: true,
    compactMode: false
};

let pendingSettings = { ...DEFAULT_SETTINGS };

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

// Применяет размер шрифта через глобальный --font-scale
function applyFontSize(size) {
    // size — «логический» базовый размер в px (12..20), где 14 = 1.0
    const scale = size / 14;
    document.documentElement.style.setProperty('--font-scale', scale);
    console.log(`Размер шрифта: ${size}px → --font-scale: ${scale.toFixed(3)}`);
}

// Применяет компактный режим через класс на body
function applyCompactMode(enabled) {
    document.body.classList.toggle('compact-mode', enabled);
    console.log(`Компактный режим: ${enabled ? 'включён' : 'выключен'}`);
}

// Применяет показ времени через класс на body
function applyShowTime(enabled) {
    document.body.classList.toggle('hide-time', !enabled);
    console.log(`Показ времени: ${enabled ? 'вкл' : 'выкл'}`);
}

function applyPendingSettings() {
    applyFontSize(pendingSettings.fontSize);
    applyCompactMode(pendingSettings.compactMode);
    applyShowTime(pendingSettings.showTime);

    saveSettings(pendingSettings);
    console.log('Все настройки применены:', pendingSettings);
}

function getPendingSettings() {
    return { ...pendingSettings };
}

function updatePendingSettings(newSettings) {
    pendingSettings = { ...pendingSettings, ...newSettings };
}

function applyAllSettings() {
    const settings = loadSettings();
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