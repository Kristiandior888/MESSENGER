// js/handlers/chat/chat-message-send.js
import { state } from '../../app.js';
import { addMessage, updateLastMessageStatusUI } from '../../utils/messageUtils.js';
import { updateLastMessageStatus } from '../../storage.js';
import { initGrpc, getCurrentChat } from './chat-core.js';
import { attachedFiles, clearAttachedFiles } from './chat-files.js';
import { showErrorMessage } from './chat-ui.js';

let isSending = false;
let isInitialized = false;

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

    // ✅ СРАЗУ показываем сообщение в DOM
    console.log('📝 Добавляем сообщение в DOM');
    addMessage(text, 'sent', true, 'sending', filesToSend);
    
    // Очищаем поле ввода
    messageField.value = '';

    try {
        const { service } = await initGrpc();
        
        console.log('📤 Отправка сообщения на сервер:', text);
        
        // Отправляем на сервер (не блокируем UI)
        service.sendMessage(chatId, text).then(response => {
            console.log('✅ Сообщение отправлено, ответ сервера:', response);
            
            // Обновляем статус сообщения в DOM
            updateLastMessageStatusUI('sent');
            updateLastMessageStatus(chatId, 'sent');
            
        }).catch(error => {
            console.error('❌ Ошибка отправки на сервер:', error);
            
            // Показываем ошибку в UI
            updateLastMessageStatusUI('error');
            showErrorMessage('Не удалось отправить сообщение');
            
            // Возвращаем текст обратно при ошибке
            if (!hasFiles) {
                messageField.value = text;
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка инициализации gRPC:', error);
        updateLastMessageStatusUI('error');
        showErrorMessage('Ошибка соединения с сервером');
    } finally {
        isSending = false;
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