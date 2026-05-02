// js/handlers/chat/chat-message-send.js
import { state } from '../../app.js';
import { addMessage } from '../../utils/messageUtils.js';
import { initGrpc, getCurrentChat } from './chat-core.js';
import { attachedFiles, clearAttachedFiles } from './chat-files.js';
import { showErrorMessage } from './chat-ui.js';

let isSending = false;
let isInitialized = false;
let pendingMessages = new Map();

// Функция для автоматического расширения textarea
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    // Сбрасываем высоту, чтобы получить правильную scrollHeight
    textarea.style.height = 'auto';
    
    // Устанавливаем новую высоту с ограничением 200px
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = newHeight + 'px';
    
    // Показываем/скрываем скролл при необходимости
    if (textarea.scrollHeight > 200) {
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.overflowY = 'hidden';
    }
}

/**
 * Отправка сообщения
 */
export async function sendMessage() {
    if (isSending) {
        console.log('Сообщение уже отправляется...');
        return;
    }

    const messageField = document.getElementById('message-field');
    if (!messageField) {
        console.error('Поле ввода не найдено');
        return;
    }

    const text = messageField.value.trim();
    const hasFiles = attachedFiles.length > 0;

    if (!text && !hasFiles) {
        console.log('Нет текста и файлов для отправки');
        return;
    }

    const chatId = getCurrentChat();
    if (!chatId) {
        alert('Сначала выберите чат');
        return;
    }

    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) {
        console.error('Контейнер сообщений не найден');
        return;
    }

    isSending = true;
    
    const filesToSend = [...attachedFiles];
    clearAttachedFiles();

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    pendingMessages.set(tempId, { text, files: filesToSend, chatId });
    
    addMessage(text, 'sent', true, 'sending', filesToSend, tempId);
    
    // Очищаем поле и сбрасываем высоту
    messageField.value = '';
    autoResizeTextarea(messageField);

    try {
        const { service } = await initGrpc();
        
        console.log('Отправка сообщения на сервер:', text);
        
        const response = await service.sendMessage(chatId, text);
        
        console.log('Сообщение отправлено, ответ сервера:', response);
        
        if (response.success && response.message) {
            const realMessageId = response.message.id;
            
            const tempMessage = document.querySelector(`.message[data-message-id="${tempId}"]`);
            if (tempMessage) {
                tempMessage.remove();
            }
            
            const existingMessage = document.querySelector(`.message[data-message-id="${realMessageId}"]`);
            
            if (!existingMessage) {
                addMessage(text, 'sent', true, 'sent', filesToSend, realMessageId);
            } else {
                const statusSpan = existingMessage.querySelector('.message-status');
                if (statusSpan) {
                    statusSpan.className = 'message-status sent';
                }
            }
            
            pendingMessages.delete(tempId);
        } else {
            updateTempMessageStatus(tempId, 'error');
            showErrorMessage('Не удалось отправить сообщение');
            
            if (!hasFiles) {
                messageField.value = text;
                autoResizeTextarea(messageField);
            }
        }
        
    } catch (error) {
        console.error('Ошибка отправки на сервер:', error);
        
        updateTempMessageStatus(tempId, 'error');
        showErrorMessage('Не удалось отправить сообщение');
        
        if (!hasFiles) {
            messageField.value = text;
            autoResizeTextarea(messageField);
        }
    } finally {
        isSending = false;
        setTimeout(() => {
            pendingMessages.forEach((_, id) => {
                const tempMessage = document.querySelector(`.message[data-message-id="${id}"]`);
                if (tempMessage) {
                    tempMessage.remove();
                }
                pendingMessages.delete(id);
            });
        }, 5000);
    }
}

function updateTempMessageStatus(tempId, newStatus) {
    const tempMessage = document.querySelector(`.message[data-message-id="${tempId}"]`);
    if (tempMessage) {
        const statusSpan = tempMessage.querySelector('.message-status');
        if (statusSpan) {
            statusSpan.className = `message-status ${newStatus}`;
            console.log(`Статус сообщения ${tempId} обновлен на ${newStatus}`);
        }
    }
}

/**
 * Настройка отправки сообщений
 */
export function setupMessageSending() {
    if (isInitialized) {
        console.log('setupMessageSending уже был вызван, пропускаем');
        return;
    }
    
    console.log('🔧 Настройка отправки сообщений');
    
    const sendBtn = document.getElementById('send-btn');
    let messageField = document.getElementById('message-field');

    if (!sendBtn || !messageField) {
        console.error('Кнопка отправки или поле ввода не найдены');
        return;
    }

    // Удаляем старые обработчики
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    
    const newMessageField = messageField.cloneNode(true);
    messageField.parentNode.replaceChild(newMessageField, messageField);
    messageField = newMessageField;
    
    // Добавляем обработчик для авто-расширения
    messageField.addEventListener('input', function() {
        autoResizeTextarea(this);
    });
    
    // Обработчик для Enter (без Shift - отправка, с Shift - новая строка)
    messageField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    newSendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
    });
    
    // Инициализируем высоту
    setTimeout(() => {
        autoResizeTextarea(messageField);
    }, 0);
    
    isInitialized = true;
    console.log('Отправка сообщений настроена');
}