// js/handlers/chat/chat-message-send.js
import { state } from '../../app.js';
import { addMessage } from '../../utils/messageUtils.js';
import { initGrpc, getCurrentChat } from './chat-core.js';
import { attachedFiles, clearAttachedFiles } from './chat-files.js';
import { showErrorMessage } from './chat-ui.js';

let isSending = false;
let isInitialized = false;
let pendingMessages = new Map();

/**
 * Автоматическое изменение высоты textarea
 */
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // максимум 120px
    textarea.style.height = newHeight + 'px';
}

/**
 * Отправка сообщения
 */
export async function sendMessage() {
    if (isSending) {
        console.log('⏳ Сообщение уже отправляется...');
        return;
    }

    const messageField = document.getElementById('message-field');
    if (!messageField) {
        console.error('❌ Поле ввода не найдено');
        return;
    }

    const text = messageField.value.trim();
    const hasFiles = attachedFiles.length > 0;

    if (!text && !hasFiles) {
        console.log('📭 Нет текста и файлов для отправки');
        return;
    }

    const chatId = getCurrentChat();
    if (!chatId) {
        alert('Сначала выберите чат');
        return;
    }

    isSending = true;
    
    const filesToSend = [...attachedFiles];
    clearAttachedFiles();

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    pendingMessages.set(tempId, { text, files: filesToSend, chatId });
    
    console.log('📝 Добавляем сообщение в DOM с временным ID:', tempId);
    addMessage(text, 'sent', true, 'sending', filesToSend, tempId);
    
    // Очищаем поле ввода и сбрасываем высоту
    messageField.value = '';
    autoResizeTextarea(messageField);

    try {
        const { service } = await initGrpc();
        
        console.log('📤 Отправка сообщения на сервер:', text);
        
        const response = await service.sendMessage(chatId, text);
        
        console.log('✅ Сообщение отправлено, ответ сервера:', response);
        
        if (response.success && response.message) {
            const tempMessage = document.querySelector(`.message[data-message-id="${tempId}"]`);
            if (tempMessage) {
                tempMessage.remove();
            }
            
            addMessage(text, 'sent', true, 'sent', filesToSend, response.message.id);
            pendingMessages.delete(tempId);
        } else {
            updateLastMessageStatusUI('error', tempId);
            showErrorMessage('Не удалось отправить сообщение');
            
            if (!hasFiles) {
                messageField.value = text;
                autoResizeTextarea(messageField);
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка отправки на сервер:', error);
        
        updateLastMessageStatusUI('error', tempId);
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

function updateLastMessageStatusUI(newStatus, messageId) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const targetMessage = messageId 
        ? document.querySelector(`.message[data-message-id="${messageId}"]`)
        : messagesDiv.querySelector('.message.sent:last-child');
    
    if (targetMessage) {
        const statusSpan = targetMessage.querySelector('.message-status');
        if (statusSpan) {
            statusSpan.className = `message-status ${newStatus}`;
            console.log(`UI статус сообщения обновлен на ${newStatus}`);
        }
    }
}

/**
 * Настройка отправки сообщений
 */
export function setupMessageSending() {
    if (isInitialized) {
        console.log('⚠️ setupMessageSending уже был вызван, пропускаем');
        return;
    }
    
    console.log('🔧 Настройка отправки сообщений');
    
    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');

    if (!sendBtn || !messageField) {
        console.error('❌ Кнопка отправки или поле ввода не найдены');
        return;
    }

    // Удаляем старые обработчики
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    
    const newMessageField = messageField.cloneNode(true);
    messageField.parentNode.replaceChild(newMessageField, messageField);
    
    // Добавляем обработчик для auto-resize
    newMessageField.addEventListener('input', function() {
        autoResizeTextarea(this);
    });
    
    // Отправка по Enter (без Shift)
    newMessageField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            sendMessage();
        }
        // Shift+Enter оставляем для переноса строки (ничего не делаем, браузер сам вставит \n)
    });
    
    newSendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
    });
    
    isInitialized = true;
    console.log('✅ Отправка сообщений настроена');
}

// Добавить в chat-message-send.js
const drafts = new Map();

export function saveDraft(chatId, text) {
    if (text.trim()) {
        drafts.set(chatId, text);
        localStorage.setItem(`draft_${chatId}`, text);
    } else {
        drafts.delete(chatId);
        localStorage.removeItem(`draft_${chatId}`);
    }
}

export function loadDraft(chatId) {
    const saved = localStorage.getItem(`draft_${chatId}`);
    if (saved) {
        const messageField = document.getElementById('message-field');
        messageField.value = saved;
        autoResizeTextarea(messageField);
    }
}
