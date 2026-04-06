// js/handlers/chat/chat-message-send.js
import { state } from '../../app.js';
import { addMessage } from '../../utils/messageUtils.js';
import { initGrpc, getCurrentChat } from './chat-core.js';
import { attachedFiles, clearAttachedFiles } from './chat-files.js';
import { showErrorMessage } from './chat-ui.js';

let isSending = false;

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
    
    // Копируем файлы (это оригинальные File объекты)
    const filesToSend = [...attachedFiles];
    clearAttachedFiles();

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📝 Добавляем сообщение в DOM с временным ID:', tempId);
    console.log('📎 Файлы для отправки:', filesToSend.map(f => f.name));
    
    // Показываем временное сообщение
    addMessage(text, 'sent', true, 'sending', filesToSend, tempId);
    
    messageField.value = '';
    autoResizeTextarea(messageField);

    try {
        const { service } = await initGrpc();
        
        console.log('📤 Отправка сообщения на сервер:', { text, hasFiles, filesCount: filesToSend.length });
        
        let response;
        
        if (hasFiles && filesToSend.length > 0) {
            // Передаем первый файл (оригинальный File объект)
            const fileToSend = filesToSend[0];
            console.log('📎 Отправляем файл:', fileToSend.name, 'тип:', fileToSend.type, 'размер:', fileToSend.size);
            response = await service.sendMessage(chatId, { text, file: fileToSend });
        } else {
            response = await service.sendMessage(chatId, { text, file: null });
        }
        
        console.log('✅ Сообщение отправлено, ответ сервера:', response);
        
        if (response.success && response.message) {
            // Удаляем временное сообщение
            const tempMessage = document.querySelector(`.message[data-message-id="${tempId}"]`);
            if (tempMessage) {
                tempMessage.remove();
            }
            
            // Добавляем финальное сообщение
            addMessage(text, 'sent', true, 'sent', filesToSend, response.message.id);
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
        showErrorMessage('Не удалось отправить сообщение: ' + (error.message || 'Неизвестная ошибка'));
        
        if (!hasFiles) {
            messageField.value = text;
            autoResizeTextarea(messageField);
        }
    } finally {
        isSending = false;
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
    console.log('🔧 Настройка отправки сообщений');
    
    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');

    if (!sendBtn || !messageField) {
        console.error('❌ Кнопка отправки или поле ввода не найдены');
        return;
    }

    const handleSend = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            sendMessage();
        }
    };
    
    const handleInput = function() {
        autoResizeTextarea(this);
    };
    
    // Удаляем старые обработчики
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    
    const newMessageField = messageField.cloneNode(true);
    messageField.parentNode.replaceChild(newMessageField, messageField);
    
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