import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { 
    loadSettings, 
    getPendingSettings, 
    updatePendingSettings, 
    applyPendingSettings 
} from '../utils/settingsUtils.js';

// НАСТРОЙКА СТРАНИЦЫ НАСТРОЕК
function setupSettingsHandlers() {
    console.log('Страница настроек загружена');
    
    // Загружаем сохраненные настройки
    const settings = loadSettings();
    
    // Элементы управления размером шрифта
    const fontSizeValue = document.getElementById('font-size-value');
    const decreaseBtn = document.getElementById('font-size-decrease');
    const increaseBtn = document.getElementById('font-size-increase');
    const previewBlock = document.querySelector('.font-preview');
    
    // Показываем текущий размер
    if (fontSizeValue) {
        fontSizeValue.textContent = settings.fontSize + 'px';
    }
    
    // Применяем размер к предпросмотру
    if (previewBlock) {
        previewBlock.style.fontSize = settings.fontSize + 'px';
    }
    
    // Уменьшение шрифта (только в предпросмотре, не в чате)
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            const currentSize = parseInt(fontSizeValue.textContent);
            const newSize = Math.max(12, currentSize - 1);
            fontSizeValue.textContent = newSize + 'px';
            
            // Обновляем предпросмотр
            if (previewBlock) {
                previewBlock.style.fontSize = newSize + 'px';
            }
            
            // Сохраняем во временные настройки
            updatePendingSettings({ fontSize: newSize });
        });
    }
    
    // Увеличение шрифта (только в предпросмотре, не в чате)
    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            const currentSize = parseInt(fontSizeValue.textContent);
            const newSize = Math.min(20, currentSize + 1);
            fontSizeValue.textContent = newSize + 'px';
            
            // Обновляем предпросмотр
            if (previewBlock) {
                previewBlock.style.fontSize = newSize + 'px';
            }
            
            // Сохраняем во временные настройки
            updatePendingSettings({ fontSize: newSize });
        });
    }
    
    // Переключатели (чекбоксы) - сохраняем во временные настройки
    const soundCheckbox = document.getElementById('sound-notifications');
    if (soundCheckbox) {
        soundCheckbox.checked = settings.soundNotifications;
        soundCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ soundNotifications: e.target.checked });
        });
    }
    
    const popupCheckbox = document.getElementById('popup-notifications');
    if (popupCheckbox) {
        popupCheckbox.checked = settings.popupNotifications;
        popupCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ popupNotifications: e.target.checked });
        });
    }
    
    const showTimeCheckbox = document.getElementById('show-time');
    if (showTimeCheckbox) {
        showTimeCheckbox.checked = settings.showTime;
        showTimeCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ showTime: e.target.checked });
        });
    }
    
    const compactModeCheckbox = document.getElementById('compact-mode');
    if (compactModeCheckbox) {
        compactModeCheckbox.checked = settings.compactMode;
        compactModeCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ compactMode: e.target.checked });
        });
    }
    
    // КНОПКА "ПРИМЕНИТЬ НАСТРОЙКИ"
    const applyBtn = document.getElementById('apply-settings-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            console.log('Применяем настройки...');
            
            // Применяем все настройки к приложению
            applyPendingSettings();
            
            // Показываем уведомление
            showNotification('Настройки успешно применены!');
            
            // Возвращаемся в чат, чтобы увидеть изменения
            setTimeout(() => {
                showScreen('chat');
            }, 1500);
        });
    }
    
    // Кнопка закрытия
    const closeBtn = document.getElementById('close-settings-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            showScreen('profile');
        });
    }
}

// Функция для показа уведомления
function showNotification(message) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'settings-notification';
    notification.textContent = message;
    
    // Добавляем на страницу
    document.body.appendChild(notification);
    
    // Показываем с анимацией
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Удаляем через 2 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

export { setupSettingsHandlers };