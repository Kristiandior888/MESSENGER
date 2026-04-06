// js/handlers/chat/chat-message-send.js
import { state } from '../../app.js';
import { addMessage } from '../../utils/messageUtils.js';
import { initGrpc, getCurrentChat } from './chat-core.js';
import { attachedFiles, clearAttachedFiles } from './chat-files.js';
import { showErrorMessage } from './chat-ui.js';

let isSending = false;
let isInitialized = false;
let pendingMessages = new Map();

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120);
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
 * Настройка отправки сообщений - ПРОСТАЯ ВЕРСИЯ
 */
export function setupMessageSending() {
    console.log('🔧 Настройка отправки сообщений');
    
    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');

    if (!sendBtn || !messageField) {
        console.error('❌ Кнопка отправки или поле ввода не найдены');
        return;
    }

    // Функция отправки
    const handleSend = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
    };
    
    const handleKeyPress = (e) => {
        // Enter без Shift - отправляем
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            sendMessage();
        }
        // Shift+Enter - перенос строки (ничего не делаем, браузер сам обработает)
    };
    
    const handleInput = function() {
        autoResizeTextarea(this);
    };
    
    // Удаляем старые обработчики
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    
    const newMessageField = messageField.cloneNode(true);
    messageField.parentNode.replaceChild(newMessageField, messageField);
    
    // Добавляем новые обработчики
    newSendBtn.addEventListener('click', handleSend);
    newMessageField.addEventListener('keydown', handleKeyPress);
    newMessageField.addEventListener('input', handleInput);
    
    console.log('✅ Отправка сообщений настроена');
}

export function saveDraft(chatId, text) {
    if (text.trim()) {
        localStorage.setItem(`draft_${chatId}`, text);
    } else {
        localStorage.removeItem(`draft_${chatId}`);
    }
}

export function loadDraft(chatId) {
    const saved = localStorage.getItem(`draft_${chatId}`);
    if (saved) {
        const messageField = document.getElementById('message-field');
        if (messageField) {
            messageField.value = saved;
            autoResizeTextarea(messageField);
        }
    }
}