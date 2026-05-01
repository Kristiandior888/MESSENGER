// js/utils/messageUtils.js
import { state } from '../app.js';
import { getFileIcon, formatFileSize, getFileFromStorage, downloadFile } from '../utils/fileUtils.js';

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
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Добавление сообщения
 */
function addMessage(text, type, saveToStorage = false, status = 'sent', files = null, customMessageId = null) {
    console.log('📝 addMessage вызвана:', text, type, 'статус:', status, 'файлы:', files);

    const time = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageId = customMessageId || generateMessageId();

    if (isMessageExists(messageId)) {
        console.log('⚠️ Сообщение с ID', messageId, 'уже существует, пропускаем');
        return messageId;
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
    
    if (text) {
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.innerHTML = processEmojiText(text);
        messageDiv.appendChild(textDiv);
    }
    
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
                    <div class="file-name">${escapeHtml(fileData.name)}</div>
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
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = time;
    
    if (type === 'sent') {
        const statusSpan = document.createElement('span');
        statusSpan.className = `message-status ${status}`;
        metaDiv.appendChild(timeSpan);
        metaDiv.appendChild(statusSpan);
    } else {
        metaDiv.appendChild(timeSpan);
    }
    
    messageDiv.appendChild(metaDiv);
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    console.log('✅ Сообщение добавлено в DOM с ID:', messageId);
    
    return messageId;
}

/**
 * Экранирование HTML
 */
function escapeHtml(str) {
    if (!str) return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Обработка текста с эмодзи
 */
function processEmojiText(text) {
    if (!text) return text;
    
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    
    const parts = text.split(emojiRegex);
    const matches = text.match(emojiRegex) || [];
    
    if (matches.length === 0) return escapeHtml(text);
    
    let result = '';
    for (let i = 0; i < matches.length; i++) {
        result += escapeHtml(parts[i]);
        result += `<span class="emoji-char">${matches[i]}</span>`;
    }
    result += escapeHtml(parts[parts.length - 1]);
    
    return result;
}

export { 
    addMessage, 
    generateMessageId,
    processEmojiText
};