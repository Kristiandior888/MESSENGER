// Утилиты для управления темой

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

// Применить тему
function applyTheme(theme) {
    const linkElement = document.getElementById('theme-style');
    
    if (!linkElement) {
        // Если элемента нет, создаем его
        const newLink = document.createElement('link');
        newLink.id = 'theme-style';
        newLink.rel = 'stylesheet';
        
        if (theme === THEMES.LIGHT) {
            newLink.href = 'style-light.css';
        } else {
            newLink.href = 'style.css'; // темная тема по умолчанию
        }
        
        document.head.appendChild(newLink);
    } else {
        // Обновляем существующий элемент
        if (theme === THEMES.LIGHT) {
            linkElement.href = 'style-light.css';
        } else {
            linkElement.href = 'style.css';
        }
    }
    
    currentTheme = theme;
    console.log(`Тема применена: ${theme}`);

    // Обновляем CSS-переменные для панели эмодзи
    updateEmojiPanelColors(theme);
    
    console.log(`Тема применена: ${theme}`);
}


// Функция обновления цветов панели эмодзи
function updateEmojiPanelColors(theme) {
    const root = document.documentElement;
    
    if (theme === THEMES.LIGHT) {
        root.style.setProperty('--emoji-panel-bg', '#fcf9f5');
        root.style.setProperty('--emoji-panel-border', '#e8e0d5');
        root.style.setProperty('--emoji-category-color', '#8b7a62');
        root.style.setProperty('--emoji-category-hover-bg', '#ffffff');
        root.style.setProperty('--emoji-category-hover-color', '#5c4e3d');
        root.style.setProperty('--emoji-category-active-bg', 'rgba(184, 139, 74, 0.1)');
        root.style.setProperty('--emoji-category-active-color', '#b88b4a');
        root.style.setProperty('--emoji-scrollbar-track', '#fcf9f5');
        root.style.setProperty('--emoji-scrollbar-thumb', '#d4c5b3');
        root.style.setProperty('--emoji-scrollbar-thumb-hover', '#b88b4a');
        root.style.setProperty('--emoji-item-bg', 'transparent');
        root.style.setProperty('--emoji-item-hover-bg', '#ffffff');
        root.style.setProperty('--emoji-item-color', '#4a4a4a');
    } else {
        root.style.setProperty('--emoji-panel-bg', '#2a2f38');
        root.style.setProperty('--emoji-panel-border', '#3a424c');
        root.style.setProperty('--emoji-category-color', '#a0a8b4');
        root.style.setProperty('--emoji-category-hover-bg', '#3a424c');
        root.style.setProperty('--emoji-category-hover-color', '#d4af37');
        root.style.setProperty('--emoji-category-active-bg', 'rgba(212, 175, 55, 0.15)');
        root.style.setProperty('--emoji-category-active-color', '#d4af37');
        root.style.setProperty('--emoji-scrollbar-track', '#2a2f38');
        root.style.setProperty('--emoji-scrollbar-thumb', '#4a535f');
        root.style.setProperty('--emoji-scrollbar-thumb-hover', '#d4af37');
        root.style.setProperty('--emoji-item-bg', 'transparent');
        root.style.setProperty('--emoji-item-hover-bg', '#3a424c');
        root.style.setProperty('--emoji-item-color', '#ffffff');
    }
}


// Сохранить тему
function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        currentTheme = theme;
        console.log(`Тема сохранена: ${theme}`);
        return true;
    } catch (error) {
        console.error('Ошибка сохранения темы:', error);
        return false;
    }
}

// Переключить тему
function toggleTheme() {
    const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    applyTheme(newTheme);
    saveTheme(newTheme);
    return newTheme;
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
    toggleTheme,
    getCurrentTheme,
    updateThemeSwitcherUI,
    initTheme
};