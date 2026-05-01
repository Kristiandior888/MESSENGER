// js/handlers/groups/group-actions.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { loadMessagesFromServer } from '../chat/chat-messages.js';
import { updateChatsList } from './index.js';
import { showErrorMessage } from '../chat/chat-ui.js';

/**
 * Выход из группы
 */
export async function leaveGroup(groupId) {
    try {
        // TODO: Добавить API для выхода из группы, когда будет реализовано на бэкенде
        // const { service } = await initGrpc();
        // await service.leaveGroup(groupId);
        
        const group = state.chats.find(c => c.id === groupId);
        const groupName = group?.name || 'Группа';
        
        // Удаляем из локального списка
        const index = state.chats.findIndex(c => c.id === groupId);
        if (index !== -1) {
            state.chats.splice(index, 1);
        }
        
        await updateChatsList();
        
        // Если вышли из текущего чата, переключаемся на первый доступный
        if (state.currentChat === groupId) {
            state.currentChat = state.chats[0]?.id || null;
            if (state.currentChat) {
                await loadMessagesFromServer(state.currentChat);
            } else {
                const { updateChatAreaUI } = await import('../chat/chat-ui.js');
                await updateChatAreaUI();
            }
        }
        
        showInfoMessage(`Вы вышли из группы "${groupName}"`);
    } catch (error) {
        console.error('Ошибка выхода из группы:', error);
        showErrorMessage('Не удалось выйти из группы');
    }
}

/**
 * Очистка истории чата
 */
export function clearChatHistory(chatId) {
    // Очищаем сообщения в DOM
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv && state.currentChat === chatId) {
        messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
    }
    
    // TODO: Добавить API для очистки истории на сервере
    console.log(`Очистка истории чата ${chatId}`);
    showInfoMessage('История очищена');
}

/**
 * Показать информационное сообщение
 */
function showInfoMessage(message) {
    // Используем существующую систему уведомлений
    const notification = document.createElement('div');
    notification.className = 'settings-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/**
 * Выход из системы (глобальный)
 */
export function logout() {
    console.log('🚪 Выход из системы');
    
    // Очищаем localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('userAvatar');
    
    // Очищаем состояние
    state.isAuthenticated = false;
    state.currentUser = null;
    state.token = null;
    state.currentChat = null;
    state.userAvatar = null;
    state.chats = [];
    
    // Показываем экран входа
    showScreen('login');
}