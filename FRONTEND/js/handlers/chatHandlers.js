import { showScreen } from '../ui.js';
import { addMessage, updateLastMessageStatusUI } from '../utils/messageUtils.js';
import { state } from '../app.js';
import { getMessages, updateLastMessageStatus } from '../storage.js';
import { getFileIcon, formatFileSize, getFileFromStorage, downloadFile, saveFileToStorage } from '../utils/fileUtils.js';
import {
    searchMessages,
    highlightSearchResults,
    nextResult,
    prevResult,
    clearSearch,
    searchState
} from '../utils/searchUtils.js';
import { showCreateGroupModal, updateChatsList, showChatContextMenu } from './groupHandlers.js';
import { renderEmojiPanel } from '../utils/emojiUtils.js';

let grpcService;
let grpcStream;

// Состояние модуля
let attachedFiles = [];
let currentChatId = null;
let isSending = false; // Для предотвращения двойной отправки

// Асинхронная инициализация gRPC
async function initGrpc() {
    if (!grpcService) {
        const serviceModule = await import('../grpc/grpc-service.js');
        grpcService = serviceModule.default || serviceModule;

        const streamModule = await import('../grpc/grpc-stream.js');
        grpcStream = streamModule.default || streamModule;
    }
    return { service: grpcService, stream: grpcStream };
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Отправка сообщения
 */
async function sendMessage() {
    // Предотвращаем двойную отправку
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

    // Проверяем, есть что отправлять
    if (!text && !hasFiles) {
        console.log('📭 Нет текста и файлов для отправки');
        return;
    }

    // Проверяем, выбран ли чат
    const chatId = state.currentChat || currentChatId;
    if (!chatId) {
        console.error('❌ Нет выбранного чата');
        
        // Пытаемся создать новый чат, если есть текущий пользователь
        if (state.currentUser?.email) {
            const newChat = await createNewChat(state.currentUser.email);
            if (newChat) {
                state.currentChat = newChat.id;
                currentChatId = newChat.id;
            } else {
                alert('Сначала выберите или создайте чат');
                return;
            }
        } else {
            alert('Сначала выберите чат');
            return;
        }
    }

    // Блокируем отправку
    isSending = true;
    
    // Сохраняем файлы для отправки и очищаем список
    const filesToSend = [...attachedFiles];
    attachedFiles = [];
    updateAttachedFilesIndicator(attachedFiles);

    // Показываем сообщение в интерфейсе
    const finalChatId = state.currentChat || currentChatId;
    addMessage(text, 'sent', true, 'sending', filesToSend);
    messageField.value = '';

    try {
        // Инициализируем gRPC
        const { service } = await initGrpc();
        
        // Проверяем существование чата на сервере
        const chatExists = await checkChatExists(finalChatId);
        
        if (!chatExists) {
            console.warn('⚠️ Чат не найден на сервере, создаем новый...');
            const newChat = await createNewChat(state.currentUser?.email || 'user');
            if (newChat) {
                state.currentChat = newChat.id;
                currentChatId = newChat.id;
                await service.sendMessage(newChat.id, text);
            } else {
                throw new Error('Не удалось создать чат');
            }
        } else {
            // Отправляем сообщение в существующий чат
            await service.sendMessage(finalChatId, text);
        }
        
        // Обновляем статус сообщения
        updateLastMessageStatusUI('sent');
        updateLastMessageStatus(finalChatId, 'sent');
        console.log('✅ Сообщение успешно отправлено');
        
    } catch (error) {
        console.error('❌ Ошибка отправки сообщения:', error);
        
        // Показываем ошибку пользователю
        updateLastMessageStatusUI('error');
        
        // Возвращаем файлы обратно в список прикрепленных
        attachedFiles = [...attachedFiles, ...filesToSend];
        updateAttachedFilesIndicator(attachedFiles);
        
        // Восстанавливаем текст сообщения
        messageField.value = text;
        
        // Показываем уведомление об ошибке
        showErrorMessage('Не удалось отправить сообщение. Проверьте соединение с сервером.');
        
    } finally {
        // Разблокируем отправку
        isSending = false;
    }
}

/**
 * Проверка существования чата на сервере
 */
async function checkChatExists(chatId) {
    try {
        const { service } = await initGrpc();
        const response = await service.getChats();
        
        // Проверяем, есть ли чат с таким ID
        const exists = response.chats?.some(chat => chat.id === chatId);
        console.log(`🔍 Чат ${chatId} ${exists ? 'существует' : 'не существует'} на сервере`);
        return exists;
        
    } catch (error) {
        console.error('❌ Ошибка проверки существования чата:', error);
        return false; // В случае ошибки предполагаем, что чата нет
    }
}

/**
 * Создание нового чата
 */
async function createNewChat(participantEmail) {
    try {
        const { service } = await initGrpc();
        
        // Формируем имя чата
        const chatName = `Чат с ${participantEmail}`;
        
        const response = await service.createChat({
            name: chatName,
            participants: [participantEmail],
            type: 'private'
        });
        
        console.log('✅ Новый чат создан:', response);
        
        // Обновляем список чатов
        await loadChatsFromServer();
        
        return response.chat || response;
        
    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        showErrorMessage('Не удалось создать чат');
        return null;
    }
}

/**
 * Показ сообщения об ошибке пользователю
 */
function showErrorMessage(message) {
    // Проверяем, есть ли уже элемент с ошибкой
    let errorToast = document.querySelector('.error-toast');
    
    if (!errorToast) {
        errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        document.body.appendChild(errorToast);
    }
    
    errorToast.textContent = message;
    errorToast.style.display = 'block';
    
    // Скрываем через 3 секунды
    setTimeout(() => {
        errorToast.style.display = 'none';
    }, 3000);
}

/**
 * Обновление индикатора прикрепленных файлов
 */
function updateAttachedFilesIndicator(files) {
    const btn = document.getElementById('attach-btn');
    if (btn) {
        if (files.length > 0) {
            btn.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
            btn.style.borderColor = '#d4af37';
            btn.title = `${files.length} файл(ов) прикреплено`;
            
            // Добавляем счетчик файлов
            let counter = btn.querySelector('.file-counter');
            if (!counter) {
                counter = document.createElement('span');
                counter.className = 'file-counter';
                btn.appendChild(counter);
            }
            counter.textContent = files.length;
            
        } else {
            btn.style.backgroundColor = 'transparent';
            btn.style.borderColor = '#3a424c';
            btn.title = 'Прикрепить файл';
            
            const counter = btn.querySelector('.file-counter');
            if (counter) counter.remove();
        }
    }
}

// ==================== ФУНКЦИИ ЗАГРУЗКИ ====================

/**
 * Загрузка чатов с сервера
 */
async function loadChatsFromServer() {
    const { service } = await initGrpc();
    console.log('👤 Текущий пользователь:', state.currentUser); 
    
    try {
        const response = await service.getChats();
        console.log('📋 Получены чаты:', response.chats);

        const chatsList = document.querySelector('.chats-list');
        if (!chatsList) return [];

        if (response.chats && response.chats.length > 0) {
            chatsList.innerHTML = '';

            response.chats.forEach(chat => {
                const chatItem = createChatItemElement(chat);
                chatsList.appendChild(chatItem);
            });

            // Если нет выбранного чата, выбираем первый
            if (!state.currentChat && !currentChatId) {
                const firstChat = response.chats[0];
                state.currentChat = firstChat.id;
                currentChatId = firstChat.id;
                
                // Подсвечиваем первый чат
                const firstChatItem = chatsList.querySelector('.chat-item');
                if (firstChatItem) {
                    firstChatItem.classList.add('active');
                }
                
                // Загружаем сообщения для первого чата
                await loadMessagesFromServer(firstChat.id);
            }
        } else {
            // Если чатов нет, показываем заглушку
            chatsList.innerHTML = '<div class="no-chats">Нет чатов. Создайте новый чат или напишите кому-нибудь.</div>';
        }

        return response.chats;
    } catch (error) {
        console.error('❌ Ошибка загрузки чатов:', error);
        showErrorMessage('Не удалось загрузить список чатов');
        return [];
    }
}

/**
 * Создание элемента чата
 */
function createChatItemElement(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.textContent = chat.name || `Чат ${chat.id}`;
    chatItem.dataset.chatId = chat.id;
    
    // Добавляем аватар или иконку
    const avatar = document.createElement('div');
    avatar.className = 'chat-item-avatar';
    avatar.textContent = (chat.name || 'Ч')[0].toUpperCase();
    chatItem.prepend(avatar);

    // Обработчик клика
    chatItem.addEventListener('click', () => {
        document.querySelectorAll('.chat-item').forEach(ci =>
            ci.classList.remove('active'));
        chatItem.classList.add('active');
        
        state.currentChat = chat.id;
        currentChatId = chat.id;
        
        loadMessagesFromServer(chat.id);
    });

    // Обработчик контекстного меню
    chatItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const chat = state.chats?.find(c => c.id === chat.id);
        if (chat) {
            showChatContextMenu(e, chat);
        }
    });

    return chatItem;
}

/**
 * Загрузка сообщений с сервера
 */
async function loadMessagesFromServer(chatId) {
    const { service } = await initGrpc();
    try {
        console.log(`🔄 Загрузка сообщений для чата ${chatId}...`);
        const response = await service.getMessages(chatId, 50);
        console.log('💬 Получены сообщения:', response.messages);

        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '';

        if (!response.messages || response.messages.length === 0) {
            messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
            return;
        }

        response.messages.forEach(msg => {
            const messageElement = createMessageElement(msg);
            messagesDiv.appendChild(messageElement);
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки сообщений:', error);
        showErrorMessage('Не удалось загрузить сообщения');
    }
}

/**
 * Создание элемента сообщения
 */
function createMessageElement(msg) {
    const type = msg.sender_id === state.currentUser?.id ? 'sent' : 'received';
    const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    if (msg.text) {
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = msg.text;
        messageDiv.appendChild(textDiv);
    }

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = time;

    if (type === 'sent') {
        const statusSpan = document.createElement('span');
        statusSpan.className = `message-status ${msg.status?.toLowerCase() || 'sent'}`;
        metaDiv.appendChild(timeSpan);
        metaDiv.appendChild(statusSpan);
    } else {
        metaDiv.appendChild(timeSpan);
    }

    messageDiv.appendChild(metaDiv);
    
    return messageDiv;
}

/**
 * Загрузка сообщений для выбранного чата (из локального хранилища)
 */
function loadMessagesForChat(chatName) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    messagesDiv.innerHTML = '';

    const messages = getMessages(chatName);

    if (messages.length > 0) {
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.type}`;

            if (msg.text) {
                const textDiv = document.createElement('div');
                textDiv.className = 'text';
                textDiv.textContent = msg.text;
                messageDiv.appendChild(textDiv);
            }

            if (msg.files && msg.files.length > 0) {
                const filesContainer = document.createElement('div');
                filesContainer.className = 'message-files';

                msg.files.forEach(fileData => {
                    const fileDiv = createFileElement(fileData);
                    filesContainer.appendChild(fileDiv);
                });

                messageDiv.appendChild(filesContainer);
            }

            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';

            const timeSpan = document.createElement('span');
            timeSpan.className = 'time';
            timeSpan.textContent = msg.time;

            if (msg.type === 'sent') {
                const statusSpan = document.createElement('span');
                statusSpan.className = `message-status ${msg.status || 'sent'}`;
                metaDiv.appendChild(timeSpan);
                metaDiv.appendChild(statusSpan);
            } else {
                metaDiv.appendChild(timeSpan);
            }

            messageDiv.appendChild(metaDiv);
            messagesDiv.appendChild(messageDiv);
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        setTimeout(() => {
            if (searchState && searchState.query) {
                highlightSearchResults();
            }
        }, 100);
    } else {
        messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
    }
}

/**
 * Создание элемента файла
 */
function createFileElement(fileData) {
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

    return fileDiv;
}

// ==================== НАСТРОЙКА ОБРАБОТЧИКОВ ====================

/**
 * Настройка всех обработчиков для экрана чата
 */
function setupChatHandlers() {
    console.log('📱 Чат загружен!');

    // Загружаем чаты с сервера
    loadChatsFromServer();

    // Устанавливаем email пользователя
    const userEmail = document.getElementById('user-email');
    if (userEmail && state.currentUser) {
        userEmail.textContent = state.currentUser.email;
    }

    // Устанавливаем аватар
    setupAvatar();

    // Настраиваем кнопку создания группы
    setupCreateGroupButton();

    // Настраиваем прикрепление файлов
    setupFileAttachment();

    // Настраиваем отправку сообщений
    setupMessageSending();

    // Настраиваем поиск
    setupSearch();

    // Настраиваем эмодзи
    setupEmojiPanel();

    // Обновляем список чатов
    updateChatsList();
    
    // Загружаем сообщения для текущего чата
    if (state.currentChat || currentChatId) {
        loadMessagesForChat(state.currentChat || currentChatId);
    }
}

/**
 * Настройка аватара
 */
function setupAvatar() {
    const chatAvatar = document.getElementById('chat-avatar');
    if (chatAvatar) {
        if (state.userAvatar) {
            chatAvatar.src = state.userAvatar;
        } else {
            const savedAvatar = localStorage.getItem('userAvatar');
            if (savedAvatar) {
                state.userAvatar = savedAvatar;
                chatAvatar.src = savedAvatar;
            }
        }
    }

    const avatarWrapper = document.getElementById('avatar-wrapper');
    if (avatarWrapper) {
        avatarWrapper.addEventListener('click', () => {
            showScreen('profile');
        });
    }
}

/**
 * Настройка кнопки создания группы
 */
function setupCreateGroupButton() {
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showCreateGroupModal();
        });
    }
}

/**
 * Настройка прикрепления файлов
 */
function setupFileAttachment() {
    const attachBtn = document.getElementById('attach-btn');
    const fileUpload = document.getElementById('file-upload');

    if (attachBtn && fileUpload) {
        attachBtn.addEventListener('click', () => {
            fileUpload.click();
        });

        fileUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);

            for (const file of files) {
                if (file.size > 10 * 1024 * 1024) {
                    alert(`Файл ${file.name} слишком большой. Максимальный размер - 10MB`);
                    continue;
                }

                try {
                    const fileId = await saveFileToStorage(file);
                    attachedFiles.push({
                        id: fileId,
                        name: file.name,
                        size: file.size,
                        type: file.type
                    });
                    console.log(`✅ Файл прикреплен: ${file.name}`);
                } catch (error) {
                    console.error('❌ Ошибка при загрузке файла:', error);
                    alert(`Не удалось загрузить файл ${file.name}`);
                }
            }

            fileUpload.value = '';
            updateAttachedFilesIndicator(attachedFiles);
        });
    }
}

/**
 * Настройка отправки сообщений
 */
function setupMessageSending() {
    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');

    if (sendBtn && messageField) {
        sendBtn.addEventListener('click', sendMessage);
        
        messageField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Добавляем авто-высоту для textarea
        messageField.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
}

/**
 * Настройка поиска
 */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const closeSearchBtn = document.getElementById('close-search-results');
    const nextResultBtn = document.getElementById('next-result');
    const prevResultBtn = document.getElementById('prev-result');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchMessages(query);
                highlightSearchResults();
            } else {
                clearSearch();
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchMessages(query);
                    highlightSearchResults();
                } else {
                    clearSearch();
                }
            }
        });

        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => {
                clearSearch();
                if (searchInput) searchInput.value = '';
            });
        }

        if (nextResultBtn) {
            nextResultBtn.addEventListener('click', nextResult);
        }

        if (prevResultBtn) {
            prevResultBtn.addEventListener('click', prevResult);
        }
    }
}

/**
 * Настройка панели эмодзи
 */
function setupEmojiPanel() {
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
    const emojiContainer = document.getElementById('emoji-container');
    const categoryBtns = document.querySelectorAll('.emoji-category');

    if (emojiBtn && emojiPanel && emojiContainer) {
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = emojiPanel.style.display === 'flex';

            if (!isVisible) {
                positionEmojiPanel(emojiBtn, emojiPanel);
                renderEmojiPanel(emojiContainer, 'recent');
            } else {
                emojiPanel.style.display = 'none';
            }
        });

        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const category = btn.getAttribute('data-category');
                renderEmojiPanel(emojiContainer, category);
            });
        });

        // Закрытие при клике вне панели
        document.addEventListener('click', (e) => {
            if (!emojiPanel.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
                emojiPanel.style.display = 'none';
            }
        });

        // Закрытие при скролле
        window.addEventListener('scroll', () => {
            if (emojiPanel.style.display === 'flex') {
                emojiPanel.style.display = 'none';
            }
        }, true);
    }
}

/**
 * Позиционирование панели эмодзи
 */
function positionEmojiPanel(emojiBtn, emojiPanel) {
    const btnRect = emojiBtn.getBoundingClientRect();
    const panelWidth = 350;
    const windowWidth = window.innerWidth;

    let left = btnRect.left;

    if (left + panelWidth > windowWidth) {
        left = windowWidth - panelWidth - 10;
    }

    if (left < 10) {
        left = 10;
    }

    emojiPanel.style.position = 'fixed';
    emojiPanel.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px';
    emojiPanel.style.left = left + 'px';
    emojiPanel.style.display = 'flex';
}

// ==================== ЭКСПОРТЫ ====================

export { 
    setupChatHandlers, 
    loadMessagesForChat,
    sendMessage,
    loadChatsFromServer,
    createNewChat
};