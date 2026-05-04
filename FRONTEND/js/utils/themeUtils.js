// js/utils/themeUtils.js

const THEME_STORAGE_KEY = 'app_theme';

// Доступные темы
const THEMES = {
    DARK: 'dark',
    LIGHT: 'light'
};

// Текущая тема
let currentTheme = THEMES.DARK;

// Загрузить сохраненную тему
function loadSavedTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
            currentTheme = savedTheme;
        }
    } catch (error) {
        console.error('Ошибка загрузки темы:', error);
    }
    return currentTheme;
}

// Применить тему (без перезагрузки)
function applyTheme(theme) {
    const linkElement = document.getElementById('theme-style');
    const isLight = theme === THEMES.LIGHT;
    
    if (!linkElement) {
        const newLink = document.createElement('link');
        newLink.id = 'theme-style';
        newLink.rel = 'stylesheet';
        
        if (isLight) {
            newLink.href = 'style-light.css';
        } else {
            newLink.href = 'style.css';
        }
        
        document.head.appendChild(newLink);
    } else {
        if (isLight) {
            linkElement.href = 'style-light.css';
        } else {
            linkElement.href = 'style.css';
        }
    }
    
    // Обновляем класс на body
    if (isLight) {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
    
    currentTheme = theme;
    console.log(`🎨 Тема применена: ${theme}`);
}

// Сохранить тему
function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        currentTheme = theme;
        console.log(`💾 Тема сохранена: ${theme}`);
        return true;
    } catch (error) {
        console.error('Ошибка сохранения темы:', error);
        return false;
    }
}

// Получить текущую тему
function getCurrentTheme() {
    return currentTheme;
}

// Обновить активный класс в переключателе тем
function updateThemeSwitcherUI() {
    const darkOption = document.getElementById('theme-dark');
    const lightOption = document.getElementById('theme-light');
    
    if (darkOption && lightOption) {
        if (currentTheme === THEMES.DARK) {
            darkOption.classList.add('active');
            lightOption.classList.remove('active');
        } else {
            lightOption.classList.add('active');
            darkOption.classList.remove('active');
        }
    }
}

// Инициализация темы при загрузке
function initTheme() {
    loadSavedTheme();
    applyTheme(currentTheme);
}

export {
    THEMES,
    loadSavedTheme,
    applyTheme,
    saveTheme,
    getCurrentTheme,
    updateThemeSwitcherUI,
    initTheme
};