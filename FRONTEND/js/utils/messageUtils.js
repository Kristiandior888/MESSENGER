// работа с сообщениями

import { saveMessage } from '../storage.js';
import { state } from '../app.js';
import { getFileIcon, formatFileSize, getFileFromStorage, downloadFile } from '../utils/fileUtils.js';

// ФУНКЦИЯ ДОБАВЛЕНИЯ СООБЩЕНИЯ 
function addMessage(text, type, saveToStorage = true, status = 'sent', files = null) {
    console.log('addMessage вызвана:', text, type, 'статус:', status, 'файлы:', files);

    // Получаем текущее время
    const time = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    let fileIds = [];

    // СОХРАНЯЕМ В ХРАНИЛИЩЕ
    if (saveToStorage && state.currentChat) {
        console.log('Сохраняем сообщение в хранилище для чата:', state.currentChat);
        
        // Сохраняем информацию о файлах
        if (files && files.length > 0) {
            fileIds = files.map(f => f.id);
            saveMessage(state.currentChat, text, type, time, status, fileIds, files);
        } else {
            saveMessage(state.currentChat, text, type, time, status);
        }
    }

    // ПОКАЗЫВАЕМ В ОКНЕ ЧАТА
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        // Текст сообщения (если есть)
        if (text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'text';
            textDiv.textContent = text;
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
                
                // Получаем иконку для файла
                const fileIcon = getFileIcon(fileData.name, fileData.type);
                
                fileDiv.innerHTML = `
                    <span class="file-icon ${fileIcon.class}">${fileIcon.icon}</span>
                    <div class="file-info">
                        <div class="file-name">${fileData.name}</div>
                        <div class="file-size">${formatFileSize(fileData.size)}</div>
                    </div>
                    <span class="download-hint">⬇️</span>
                `;
                
                // Добавляем обработчик скачивания
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
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

// Функция для обновления статуса последнего сообщения в UI
function updateLastMessageStatusUI(newStatus) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const sentMessages = messagesDiv.querySelectorAll('.message.sent');
    if (sentMessages.length > 0) {
        const lastMessage = sentMessages[sentMessages.length - 1];
        const statusSpan = lastMessage.querySelector('.message-status');
        if (statusSpan) {
            statusSpan.className = `message-status ${newStatus}`;
            console.log(`UI статус обновлен на ${newStatus}`);
        }
    }
}

export { addMessage, updateLastMessageStatusUI };