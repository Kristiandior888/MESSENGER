// js/handlers/settingsHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { 
    loadSettings, 
    getPendingSettings, 
    updatePendingSettings, 
    applyPendingSettings 
} from '../utils/settingsUtils.js';
import { updateChatsList } from './groups/index.js';

// Флаг, чтобы предотвратить повторную инициализацию
let isApplying = false;

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
    
    // Уменьшение шрифта
    if (decreaseBtn) {
        const newDecreaseBtn = decreaseBtn.cloneNode(true);
        decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn);
        
        newDecreaseBtn.addEventListener('click', () => {
            const currentSize = parseInt(fontSizeValue.textContent);
            const newSize = Math.max(12, currentSize - 1);
            fontSizeValue.textContent = newSize + 'px';
            
            if (previewBlock) {
                previewBlock.style.fontSize = newSize + 'px';
            }
            
            updatePendingSettings({ fontSize: newSize });
        });
    }
    
    // Увеличение шрифта
    if (increaseBtn) {
        const newIncreaseBtn = increaseBtn.cloneNode(true);
        increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn);
        
        newIncreaseBtn.addEventListener('click', () => {
            const currentSize = parseInt(fontSizeValue.textContent);
            const newSize = Math.min(20, currentSize + 1);
            fontSizeValue.textContent = newSize + 'px';
            
            if (previewBlock) {
                previewBlock.style.fontSize = newSize + 'px';
            }
            
            updatePendingSettings({ fontSize: newSize });
        });
    }
    
    // Переключатели (чекбоксы)
    const soundCheckbox = document.getElementById('sound-notifications');
    if (soundCheckbox) {
        const newSoundCheckbox = soundCheckbox.cloneNode(true);
        soundCheckbox.parentNode.replaceChild(newSoundCheckbox, soundCheckbox);
        newSoundCheckbox.checked = settings.soundNotifications;
        newSoundCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ soundNotifications: e.target.checked });
        });
    }
    
    const popupCheckbox = document.getElementById('popup-notifications');
    if (popupCheckbox) {
        const newPopupCheckbox = popupCheckbox.cloneNode(true);
        popupCheckbox.parentNode.replaceChild(newPopupCheckbox, popupCheckbox);
        newPopupCheckbox.checked = settings.popupNotifications;
        newPopupCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ popupNotifications: e.target.checked });
        });
    }
    
    const showTimeCheckbox = document.getElementById('show-time');
    if (showTimeCheckbox) {
        const newShowTimeCheckbox = showTimeCheckbox.cloneNode(true);
        showTimeCheckbox.parentNode.replaceChild(newShowTimeCheckbox, showTimeCheckbox);
        newShowTimeCheckbox.checked = settings.showTime;
        newShowTimeCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ showTime: e.target.checked });
        });
    }
    
    const compactModeCheckbox = document.getElementById('compact-mode');
    if (compactModeCheckbox) {
        const newCompactModeCheckbox = compactModeCheckbox.cloneNode(true);
        compactModeCheckbox.parentNode.replaceChild(newCompactModeCheckbox, compactModeCheckbox);
        newCompactModeCheckbox.checked = settings.compactMode;
        newCompactModeCheckbox.addEventListener('change', (e) => {
            updatePendingSettings({ compactMode: e.target.checked });
        });
    }
    
    // КНОПКА "ПРИМЕНИТЬ НАСТРОЙКИ"
    const applyBtn = document.getElementById('apply-settings-btn');
    if (applyBtn) {
        const newApplyBtn = applyBtn.cloneNode(true);
        applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
        
        newApplyBtn.addEventListener('click', async () => {
            if (isApplying) return;
            isApplying = true;
            
            console.log('Применяем настройки...');
            
            // Применяем настройки к приложению
            applyPendingSettings();
            
            // Показываем уведомление
            showNotification('Настройки успешно применены!');
            
            // Обновляем список чатов БЕЗ дублирования
            await refreshChatsWithoutDuplication();
            
            // Возвращаемся в профиль
            setTimeout(() => {
                showScreen('profile');
                isApplying = false;
            }, 1000);
        });
    }
    
    // Кнопка закрытия
    const closeBtn = document.getElementById('close-settings-btn');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', () => {
            showScreen('profile');
        });
    }
}

// Функция для обновления списка чатов без дублирования
async function refreshChatsWithoutDuplication() {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    // ОЧИЩАЕМ список перед добавлением (это ключевой момент!)
    chatsList.innerHTML = '';
    
    if (!state.chats || state.chats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats">Нет чатов. Создайте новый чат или напишите кому-нибудь.</div>';
        return;
    }
    
    // Импортируем функцию создания элемента чата
    const { createChatItemElement } = await import('./chat/chat-ui.js');
    
    // Добавляем чаты заново (без дублей, так как список очищен)
    for (const chat of state.chats) {
        const chatItem = createChatItemElement(chat);
        chatsList.appendChild(chatItem);
    }
    
    // Если есть активный чат, подсвечиваем его
    if (state.currentChat) {
        const activeChat = chatsList.querySelector(`.chat-item[data-chat-id="${state.currentChat}"]`);
        if (activeChat) {
            activeChat.classList.add('active');
        }
    }
    
    console.log('✅ Список чатов обновлен, чатов:', state.chats.length);
}

// Функция для показа уведомления
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'settings-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

export { setupSettingsHandlers };