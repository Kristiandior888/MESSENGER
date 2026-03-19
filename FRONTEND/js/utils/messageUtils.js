// js/utils/messageUtils.js
// работа с сообщениями

import { saveMessage } from '../storage.js';
import { state } from '../app.js';
import { getFileIcon, formatFileSize, getFileFromStorage, downloadFile } from '../utils/fileUtils.js';

// УДАЛЯЕМ эту функцию - она не нужна!
// async function addMessageToCache(chatId, message) {
//     try {
//         const { addNewMessage } = await import('../handlers/chat/chat-messages.js');
//         addNewMessage(chatId, message);
//     } catch (error) {
//         console.error('❌ Ошибка добавления сообщения в кэш:', error);
//     }
// }

/**
 * Проверка, существует ли уже сообщение с таким ID в DOM
 */
function isMessageExists(messageId) {
    return document.querySelector(`.message[data-message-id="${messageId}"]`) !== null;
}

/**
 * Генерация уникального ID сообщения
 */
function generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 4);
}

// ФУНКЦИЯ ДОБАВЛЕНИЯ СООБЩЕНИЯ 
function addMessage(text, type, saveToStorage = true, status = 'sent', files = null, customMessageId = null) {
    console.log('📝 addMessage вызвана:', text, type, 'статус:', status, 'файлы:', files, 'customId:', customMessageId);

    // Получаем текущее время
    const time = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Генерируем ID сообщения
    const messageId = customMessageId || generateMessageId();

    // Проверяем, нет ли уже такого сообщения в DOM
    if (isMessageExists(messageId)) {
        console.log('⚠️ Сообщение с ID', messageId, 'уже существует в DOM, пропускаем');
        return messageId;
    }

    let fileIds = [];

    // СОХРАНЯЕМ В ХРАНИЛИЩЕ
    if (saveToStorage && state.currentChat) {
        console.log('💾 Сохраняем сообщение в хранилище для чата:', state.currentChat);
        
        if (files && files.length > 0) {
            fileIds = files.map(f => f.id);
            saveMessage(state.currentChat, text, type, time, status, fileIds, files);
        } else {
            saveMessage(state.currentChat, text, type, time, status);
        }
    }

    // ПОКАЗЫВАЕМ В ОКНЕ ЧАТА
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) {
        console.error('❌ messagesDiv не найден!');
        return messageId;
    }

    console.log('🆕 Создаем элемент сообщения');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.dataset.messageId = messageId;
    
    // Текст сообщения (если есть)
    if (text) {
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.innerHTML = processEmojiText(text);
        messageDiv.appendChild(textDiv);
    }
    
    // Если есть файлы, отображаем их
    if (files && files.length > 0) {
        const filesContainer = document.createElement('div');
        filesContainer.className = 'message-files';
        
        files.forEach(fileData => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'message-file';
            fileDiv.setAttribute('data-file-id', fileData.id);
            
            const fileIcon = getFileIcon(fileData.name, fileData.type);
            
            fileDiv.innerHTML = `
                <span class="file-icon ${fileIcon.class}">${fileIcon.icon}</span>
                <div class="file-info">
                    <div class="file-name">${fileData.name}</div>
                    <div class="file-size">${formatFileSize(fileData.size)}</div>
                </div>
                <span class="download-hint">⬇️</span>
            `;
            
            fileDiv.addEventListener('click', () => {
                const savedFile = getFileFromStorage(fileData.id);
                if (savedFile) {
                    downloadFile(savedFile, fileData.name);
                } else {
                    alert('Файл не найден в хранилище');
                }
            });
            
            filesContainer.appendChild(fileDiv);
        });
        
        messageDiv.appendChild(filesContainer);
    }
    
    // Контейнер для времени и статуса
    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    
    // Время
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = time;
    
    // Статус (только для исходящих)
    if (type === 'sent') {
        const statusSpan = document.createElement('span');
        statusSpan.className = `message-status ${status}`;
        metaDiv.appendChild(timeSpan);
        metaDiv.appendChild(statusSpan);
    } else {
        metaDiv.appendChild(timeSpan);
    }
    
    messageDiv.appendChild(metaDiv);
    
    // ✅ Добавляем в DOM
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    console.log('✅ Сообщение добавлено в DOM с ID:', messageId);
    
    return messageId;
}

// Функция для обновления статуса сообщения по ID
function updateMessageStatus(messageId, newStatus) {
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) return false;
    
    const statusSpan = messageElement.querySelector('.message-status');
    if (statusSpan) {
        statusSpan.className = `message-status ${newStatus}`;
        console.log(`✅ Статус сообщения ${messageId} обновлен на ${newStatus}`);
        return true;
    }
    
    return false;
}

// Функция для обновления статуса последнего сообщения в UI
function updateLastMessageStatusUI(newStatus, specificMessageId = null) {
    // Если передан конкретный ID, обновляем только его
    if (specificMessageId) {
        const updated = updateMessageStatus(specificMessageId, newStatus);
        if (updated) return;
    }
    
    // Иначе обновляем последнее сообщение
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

// Функция для обработки текста с эмодзи
function processEmojiText(text) {
    if (!text) return text;
    
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    
    const parts = text.split(emojiRegex);
    const matches = text.match(emojiRegex) || [];
    
    if (matches.length === 0) return text;
    
    let result = '';
    for (let i = 0; i < matches.length; i++) {
        result += parts[i];
        result += `<span class="emoji-char">${matches[i]}</span>`;
    }
    result += parts[parts.length - 1];
    
    return result;
}

export { 
    addMessage, 
    updateLastMessageStatusUI,
    updateMessageStatus,
    generateMessageId,
    processEmojiText
};