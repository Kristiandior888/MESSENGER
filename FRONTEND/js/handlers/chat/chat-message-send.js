import { state } from '../../app.js';
import { addMessage } from '../../utils/messageUtils.js';
import { initGrpc, getCurrentChat } from './chat-core.js';
import { attachedFiles, clearAttachedFiles } from './chat-files.js';
import { showErrorMessage } from './chat-ui.js';

let isSending = false;
let isInitialized = false;
let pendingMessages = new Map(); // Храним временные ID сообщений

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

    // Генерируем временный ID для сообщения
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Сохраняем временный ID в pendingMessages
    pendingMessages.set(tempId, { text, files: filesToSend, chatId });
    
    // Показываем сообщение в DOM с временным ID
    console.log('📝 Добавляем сообщение в DOM с временным ID:', tempId);
    addMessage(text, 'sent', true, 'sending', filesToSend, tempId);
    
    // Очищаем поле ввода
    messageField.value = '';

    try {
        const { service } = await initGrpc();
        
        console.log('📤 Отправка сообщения на сервер:', text);
        
        // Отправляем на сервер
        const response = await service.sendMessage(chatId, text);
        
        console.log('✅ Сообщение отправлено, ответ сервера:', response);
        
        if (response.success && response.message) {
            // Удаляем временное сообщение из DOM
            const tempMessage = document.querySelector(`.message[data-message-id="${tempId}"]`);
            if (tempMessage) {
                tempMessage.remove();
            }
            
            // Добавляем сообщение с реальным ID от сервера
            addMessage(text, 'sent', true, 'sent', filesToSend, response.message.id);
            
            // Удаляем из pendingMessages
            pendingMessages.delete(tempId);
        } else {
            // Если ошибка, обновляем статус
            updateLastMessageStatusUI('error', tempId);
            showErrorMessage('Не удалось отправить сообщение');
            
            // Возвращаем текст обратно при ошибке
            if (!hasFiles) {
                messageField.value = text;
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка отправки на сервер:', error);
        
        // Обновляем статус на ошибку
        updateLastMessageStatusUI('error', tempId);
        showErrorMessage('Не удалось отправить сообщение');
        
        // Возвращаем текст обратно при ошибке
        if (!hasFiles) {
            messageField.value = text;
        }
    } finally {
        isSending = false;
        // Очищаем временные сообщения, которые не были удалены
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

/**
 * Обновление статуса последнего сообщения в UI
 */
function updateLastMessageStatusUI(newStatus) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const sentMessages = messagesDiv.querySelectorAll('.message.sent');
    if (sentMessages.length > 0) {
        const lastMessage = sentMessages[sentMessages.length - 1];
        const statusSpan = lastMessage.querySelector('.message-status');
        if (statusSpan) {
            statusSpan.className = `message-status ${newStatus}`;
            console.log(`UI статус последнего сообщения обновлен на ${newStatus}`);
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
    
    // Добавляем новые обработчики
    newSendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
    });
    
    newMessageField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            sendMessage();
        }
    });

    newMessageField.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    isInitialized = true;
    console.log('✅ Отправка сообщений настроена');
}