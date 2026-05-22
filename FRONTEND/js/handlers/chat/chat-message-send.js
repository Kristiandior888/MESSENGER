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
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden';
}

async function uploadAttachedFilesToServer(service, filesToSend) {
    if (!filesToSend || filesToSend.length === 0) return [];

    const serverFileIds = [];

    for (const fileEntry of filesToSend) {
        if (!fileEntry.file) {
            console.warn('⚠️ Нет оригинального File-объекта для', fileEntry.name, '— пропускаем');
            continue;
        }

        try {
            console.log(`📤 Загрузка файла на сервер: ${fileEntry.name}`);
            const serverFileId = await service.uploadFile(fileEntry.file);
            serverFileIds.push(serverFileId);
            console.log(`✅ Файл загружен: ${fileEntry.name} → ${serverFileId}`);
        } catch (error) {
            console.error(`❌ Не удалось загрузить файл ${fileEntry.name}:`, error);
            throw new Error(`Не удалось загрузить файл ${fileEntry.name} на сервер`);
        }
    }

    return serverFileIds;
}

function resolveMessageType(text, files) {
    if (!files || files.length === 0) return 0;

    const hasImage = files.some(f =>
        f.type?.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
    );

    return hasImage ? 2 : 1;
}

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

    messageField.value = '';
    autoResizeTextarea(messageField);

    try {
        const { service } = await initGrpc();

        let serverFileIds = [];
        if (hasFiles) {
            console.log(`📦 Загрузка ${filesToSend.length} файл(а/ов) на сервер...`);
            serverFileIds = await uploadAttachedFilesToServer(service, filesToSend);
            console.log('📦 Server file IDs:', serverFileIds);
        }

        const msgType = resolveMessageType(text, filesToSend);

        console.log('Отправка сообщения на сервер:', text, 'fileIds:', serverFileIds);
        const response = await service.sendMessage(chatId, text, msgType, serverFileIds);
        console.log('Ответ сервера:', response);

        if (response.success && response.message) {
            const realMessageId = response.message.id;

            const tempMessage = document.querySelector(`.message[data-message-id="${tempId}"]`);
            if (tempMessage) tempMessage.remove();

            const existingMessage = document.querySelector(`.message[data-message-id="${realMessageId}"]`);
            if (!existingMessage) {
                addMessage(text, 'sent', true, 'sent', filesToSend, realMessageId);
            } else {
                const statusSpan = existingMessage.querySelector('.message-status');
                if (statusSpan) statusSpan.className = 'message-status sent';
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
        console.error('Ошибка отправки:', error);

        updateTempMessageStatus(tempId, 'error');
        showErrorMessage(error.message || 'Не удалось отправить сообщение');

        if (!hasFiles) {
            messageField.value = text;
            autoResizeTextarea(messageField);
        }
    } finally {
        isSending = false;

        setTimeout(() => {
            pendingMessages.forEach((_, id) => {
                const el = document.querySelector(`.message[data-message-id="${id}"]`);
                if (el) el.remove();
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
        }
    }
}

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

    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);

    const newMessageField = messageField.cloneNode(true);
    messageField.parentNode.replaceChild(newMessageField, messageField);
    messageField = newMessageField;

    messageField.addEventListener('input', function () {
        autoResizeTextarea(this);
    });

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

    setTimeout(() => autoResizeTextarea(messageField), 0);

    isInitialized = true;
    console.log('✅ Отправка сообщений настроена');
}