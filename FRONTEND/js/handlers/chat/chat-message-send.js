// js/handlers/chat/chat-message-send.js
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

    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) {
        console.error('❌ Контейнер сообщений не найден');
        return;
    }

    isSending = true;
    
    const filesToSend = [...attachedFiles];
    clearAttachedFiles();

    // Генерируем временный ID для сообщения
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Сохраняем временный ID в pendingMessages
    pendingMessages.set(tempId, { text, files: filesToSend, chatId });
    
    // Показываем сообщение в DOM с временным ID и статусом "sending"
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
            const realMessageId = response.message.id;
            
            // Удаляем временное сообщение из DOM
            const tempMessage = document.querySelector(`.message[data-message-id="${tempId}"]`);
            if (tempMessage) {
                tempMessage.remove();
            }
            
            // Проверяем, не добавил ли уже стрим это сообщение
            const existingMessage = document.querySelector(`.message[data-message-id="${realMessageId}"]`);
            
            if (!existingMessage) {
                // Если стрим ещё не добавил, добавляем сами
                addMessage(text, 'sent', true, 'sent', filesToSend, realMessageId);
            } else {
                // Если сообщение уже есть, просто обновляем статус
                const statusSpan = existingMessage.querySelector('.message-status');
                if (statusSpan) {
                    statusSpan.className = 'message-status sent';
                }
            }
            
            // Удаляем из pendingMessages
            pendingMessages.delete(tempId);
        } else {
            // Если ошибка, обновляем статус временного сообщения
            updateTempMessageStatus(tempId, 'error');
            showErrorMessage('Не удалось отправить сообщение');
            
            // Возвращаем текст обратно при ошибке
            if (!hasFiles) {
                messageField.value = text;
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка отправки на сервер:', error);
        
        // Обновляем статус временного сообщения на ошибку
        updateTempMessageStatus(tempId, 'error');
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
 * Обновление статуса временного сообщения по ID
 */
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