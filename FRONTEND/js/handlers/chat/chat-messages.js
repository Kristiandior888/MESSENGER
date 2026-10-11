// js/handlers/chat/chat-messages.js

import { state } from '../../app.js';
import { initGrpc, getCurrentChat, isGroupChat } from './chat-core.js';
import { updateChatsList } from '../groups/index.js';
import { showErrorMessage } from './chat-ui.js';
import { formatMessageTime, formatDateSeparator, getDateKey } from '../../utils/dateUtils.js';

let lastRenderedDateKey = null;
let isLoadingMessages = false;
let lastProcessedMessageIds = new Set();
let isStreamStarted = false;
let messageStream = null;
let reconnectTimeout = null;
let isShuttingDown = false;
let shutdownTimeout = null;
let isStoppingStream = false;

/**
 * Создание DOM-элемента сообщения
 */
export function createMessageElement(msg, chat) {
    const isSent = msg.sender_id === state.currentUser?.id;
    const type = isSent ? 'sent' : 'received';
    const timeStr = formatMessageTime(msg.timestamp);

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.dataset.messageId = msg.id;

    const isGroup = isGroupChat(chat);

    if (isGroup && !isSent) {
        let senderName = 'Пользователь';

        if (chat.participants && Array.isArray(chat.participants)) {
            const sender = chat.participants.find(p => p.id === msg.sender_id);
            if (sender) {
                senderName = sender.name || sender.email?.split('@')[0] || 'Пользователь';
            }
        }

        if (msg.sender_name) {
            senderName = msg.sender_name;
        }

        const senderDiv = document.createElement('div');
        senderDiv.className = 'message-sender';
        senderDiv.textContent = senderName;
        messageDiv.appendChild(senderDiv);
    }

    if (msg.text) {
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = msg.text;
        messageDiv.appendChild(textDiv);
    }

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';

    if (timeStr) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = timeStr;
        metaDiv.appendChild(timeSpan);
    }

    if (type === 'sent') {
        const statusSpan = document.createElement('span');
        const status = msg.status?.toLowerCase() || 'sent';
        statusSpan.className = `message-status ${status}`;
        metaDiv.appendChild(statusSpan);
    }

    messageDiv.appendChild(metaDiv);

    return messageDiv;
}

/**
 * Создание элемента-разделителя даты
 */
export function createDateSeparatorElement(timestamp) {
    const separatorDiv = document.createElement('div');
    separatorDiv.className = 'date-separator';

    const label = document.createElement('span');
    label.className = 'date-separator-label';
    label.textContent = formatDateSeparator(timestamp);

    separatorDiv.appendChild(label);
    return separatorDiv;
}

/**
 * Добавление нового сообщения в конец списка (из стрима)
 */
export function appendNewMessage(chatId, message, chat) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return false;

    const currentChat = getCurrentChat();
    if (currentChat !== chatId) return false;

    if (lastProcessedMessageIds.has(message.id)) {
        return false;
    }

    if (document.querySelector(`.message[data-message-id="${message.id}"]`)) {
        return false;
    }

    lastProcessedMessageIds.add(message.id);

    if (lastProcessedMessageIds.size > 100) {
        const toDelete = [...lastProcessedMessageIds][0];
        lastProcessedMessageIds.delete(toDelete);
    }

    const noMessagesDiv = messagesDiv.querySelector('.no-messages');
    if (noMessagesDiv) {
        noMessagesDiv.remove();
    }

    // Вставляем разделитель даты, если сменился день
    const dateKey = getDateKey(message.timestamp);
    if (dateKey && dateKey !== lastRenderedDateKey) {
        messagesDiv.appendChild(createDateSeparatorElement(message.timestamp));
        lastRenderedDateKey = dateKey;
    }

    const messageElement = createMessageElement(message, chat);
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    return true;
}

/**
 * Загрузка истории сообщений с сервера
 */
export async function loadMessagesFromServer(chatId) {
    if (!chatId) return;

    isLoadingMessages = true;

    try {
        const { service } = await initGrpc();
        const response = await service.getMessages(chatId, 50);

        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';
        lastProcessedMessageIds.clear();
        lastRenderedDateKey = null;

        if (!response.messages || response.messages.length === 0) {
            messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
            return;
        }

        const currentChat = state.chats?.find(c => c.id === chatId);

        const sortedMessages = [...response.messages].sort((a, b) => {
            const timeA = Number(a.timestamp) || 0;
            const timeB = Number(b.timestamp) || 0;
            return timeA - timeB;
        });

        sortedMessages.forEach(msg => {
            lastProcessedMessageIds.add(msg.id);
        });

        sortedMessages.forEach(msg => {
            const dateKey = getDateKey(msg.timestamp);

            if (dateKey && dateKey !== lastRenderedDateKey) {
                messagesDiv.appendChild(createDateSeparatorElement(msg.timestamp));
                lastRenderedDateKey = dateKey;
            }

            const messageElement = createMessageElement(msg, currentChat);
            messagesDiv.appendChild(messageElement);
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

    } catch (error) {
        console.error('❌ Ошибка загрузки сообщений:', error);
        showErrorMessage('Не удалось загрузить сообщения');
    } finally {
        isLoadingMessages = false;
    }
}

/**
 * Запуск глобального стрима сообщений.
 */
export async function startGlobalMessageStream() {
    if (isStreamStarted) return;

    // Если идёт остановка — подождём и попробуем ещё раз
    if (isShuttingDown) {
        setTimeout(() => {
            if (!isStreamStarted && !isShuttingDown && state.token && state.chats?.length > 0) {
                startGlobalMessageStream();
            }
        }, 1000);
        return;
    }

    if (!state.token) return;

    try {
        const { service } = await initGrpc();

        const chatIds = state.chats?.map(chat => chat.id).filter(id => id && !id.startsWith('temp_')) || [];

        if (chatIds.length === 0) {
            setTimeout(() => {
                if (!isShuttingDown && !isStreamStarted && state.chats?.length > 0) {
                    startGlobalMessageStream();
                }
            }, 2000);
            return;
        }

        const Metadata = window.grpc?.Metadata;
        if (!Metadata) return;

        const metadata = new Metadata();
        if (state.token) {
            metadata.add('authorization', `Bearer ${state.token}`);
        }

        if (typeof service.client.StreamMessages !== 'function') return;

        messageStream = service.client.StreamMessages({ chatids: chatIds }, metadata);

        messageStream.on('data', (message) => {
            const chat = state.chats?.find(c => c.id === message.chatid);
            if (!chat) return;

            if (state.currentChat === message.chatid) {
                appendNewMessage(message.chatid, message, chat);
            }

            updateChatLastMessage(message.chatid, message);
        });

        messageStream.on('error', (error) => {
            // Игнорируем отмену — мы сами остановили стрим
            if (isStoppingStream || isShuttingDown || error.code === 1) {
                console.log('Стрим отменён локально, игнорируем');
                return;
            }

            console.error('Ошибка стрима:', error);
            isStreamStarted = false;
            messageStream = null;

            if (!isShuttingDown && !isStreamStarted) {
                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(() => {
                    startGlobalMessageStream();
                }, 5000);
            }
        });

        messageStream.on('end', () => {
            isStreamStarted = false;
            messageStream = null;

            if (!isShuttingDown && !isStreamStarted && state.chats?.length > 0) {
                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(() => {
                    startGlobalMessageStream();
                }, 3000);
            }
        });

        isStreamStarted = true;

    } catch (error) {
        console.error('❌ Ошибка запуска стрима:', error);
        isStreamStarted = false;
        messageStream = null;

        if (!isShuttingDown) {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
                startGlobalMessageStream();
            }, 5000);
        }
    }
}

/**
 * Остановка глобального стрима.
 */
export async function stopGlobalMessageStream() {
    if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
    }

    isShuttingDown = true;
    isStoppingStream = true;

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (messageStream) {
        try {
            messageStream.removeAllListeners();
            messageStream.cancel();
        } catch (e) {
            console.warn('Ошибка при отмене стрима:', e.message);
        }
        messageStream = null;
    }

    isStreamStarted = false;

    shutdownTimeout = setTimeout(() => {
        isShuttingDown = false;
        isStoppingStream = false;
        shutdownTimeout = null;
    }, 1000);
}

/**
 * Обновление последнего сообщения в чате
 */
function updateChatLastMessage(chatId, message) {
    const chat = state.chats?.find(c => c.id === chatId);
    if (chat) {
        chat.last_message = message;
        updateChatsList();   // ← было refreshChatsList()
    }
}

/**
 * Заглушка: в текущей архитектуре используется один глобальный стрим
 */
export async function stopMessageStreamForChat(chatId) {
    // no-op
}

/**
 * Остановка всех стримов и очистка состояния
 */
export async function stopAllMessageStreams() {
    await stopGlobalMessageStream();
    lastProcessedMessageIds.clear();
    isLoadingMessages = false;
    lastRenderedDateKey = null;
}

/**
 * Сброс состояния сообщений (без остановки стрима)
 */
export function resetMessagesState() {
    isLoadingMessages = false;
    lastRenderedDateKey = null;
    lastProcessedMessageIds.clear();
}
