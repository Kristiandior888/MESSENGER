import { getFileIcon, formatFileSize, getFileFromStorage, downloadFile } from '../utils/fileUtils.js';
import { showScreen } from '../ui.js';
import { addMessage, updateLastMessageStatusUI } from '../utils/messageUtils.js';
import { state } from '../app.js';
import { getMessages, updateLastMessageStatus } from '../storage.js';
import { saveFileToStorage } from '../utils/fileUtils.js';
import { 
    searchMessages, 
    highlightSearchResults, 
    nextResult, 
    prevResult, 
    clearSearch,
    updateSearchUI,
    renderSearchResults
} from '../utils/searchUtils.js';

// НАСТРОЙКА ЭКРАНА ЧАТА
function setupChatHandlers() {
    console.log('Чат загружен!');

    // ОТОБРАЖАЕМ ИНФОРМАЦИЮ О ПОЛЬЗОВАТЕЛЕ 
    const userEmail = document.getElementById('user-email');
    if (userEmail && state.currentUser) {
        userEmail.textContent = state.currentUser.email;
    }

    // ЗАГРУЖАЕМ АВАТАР
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

    // ПЕРЕХОД В ПРОФИЛЬ ПРИ КЛИКЕ НА АВАТАР
    const avatarWrapper = document.getElementById('avatar-wrapper');
    if (avatarWrapper) {
        avatarWrapper.addEventListener('click', () => {
            showScreen('profile');
        });
    }

  // НАСТРАИВАЕМ ПРИКРЕПЛЕНИЕ ФАЙЛОВ
const attachBtn = document.getElementById('attach-btn');
const fileUpload = document.getElementById('file-upload');
let attachedFiles = []; // Временное хранилище для прикрепленных файлов

if (attachBtn && fileUpload) {
    attachBtn.addEventListener('click', () => {
        fileUpload.click();
    });
    
    fileUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        
        for (const file of files) {
            // Проверяем размер (макс 10MB для демо)
            if (file.size > 10 * 1024 * 1024) {
                alert(`Файл ${file.name} слишком большой. Максимальный размер - 10MB`);
                continue;
            }
            
            try {
                // Сохраняем файл в хранилище и получаем ID
                const fileId = await saveFileToStorage(file);
                
                // Добавляем в список прикрепленных файлов
                attachedFiles.push({
                    id: fileId,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
                
                // Визуально показываем, что файл прикреплен (можно добавить индикатор)
                console.log(`Файл прикреплен: ${file.name}`);
                
            } catch (error) {
                console.error('Ошибка при загрузке файла:', error);
                alert(`Не удалось загрузить файл ${file.name}`);
            }
        }
        
        // Очищаем input, чтобы можно было загрузить те же файлы снова
        fileUpload.value = '';
        
        // Можно добавить индикатор прикрепленных файлов
        updateAttachedFilesIndicator();
    });
}

// Функция для отображения индикатора прикрепленных файлов
function updateAttachedFilesIndicator() {
    const attachBtn = document.getElementById('attach-btn');
    if (attachBtn) {
        if (attachedFiles.length > 0) {
            attachBtn.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
            attachBtn.style.borderColor = '#d4af37';
            attachBtn.title = `${attachedFiles.length} файл(ов) прикреплено`;
        } else {
            attachBtn.style.backgroundColor = 'transparent';
            attachBtn.style.borderColor = '#3a424c';
            attachBtn.title = 'Прикрепить файл';
        }
    }
}

// НАСТРАИВАЕМ ОТПРАВКУ СООБЩЕНИЙ 
const sendBtn = document.getElementById('send-btn');
const messageField = document.getElementById('message-field');

if (sendBtn && messageField) {
    const sendMessage = () => {
        const text = messageField.value.trim();
        
        // Отправляем, если есть текст ИЛИ прикрепленные файлы
        if (text || attachedFiles.length > 0) {
            
            // Если есть файлы, отправляем каждый как отдельное сообщение?
            // Или один файл? Давай сделаем так: все файлы в одном сообщении
            
            // Создаем копию файлов и очищаем массив
            const filesToSend = [...attachedFiles];
            attachedFiles = [];
            updateAttachedFilesIndicator();
            
            // Отправляем сообщение с файлами
            addMessage(text, 'sent', true, 'sending', filesToSend);
            messageField.value = '';
            
            // Симуляция доставки
            setTimeout(() => {
                updateLastMessageStatusUI('sent');
                updateLastMessageStatus(state.currentChat, 'sent');
            }, 1000);
            
            setTimeout(() => {
                updateLastMessageStatusUI('delivered');
                updateLastMessageStatus(state.currentChat, 'delivered');
            }, 2000);
            
            setTimeout(() => {
                updateLastMessageStatusUI('read');
                updateLastMessageStatus(state.currentChat, 'read');
            }, 3000);
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    messageField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

    // НАСТРАИВАЕМ КНОПКУ ВЫХОДА 
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            state.isAuthenticated = false;
            state.currentUser = null;
            showScreen('login');
        });
    }

    // НАСТРАИВАЕМ ПЕРЕКЛЮЧЕНИЕ ЧАТОВ 
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            chatItems.forEach(ci => ci.classList.remove('active'));
            item.classList.add('active');

            const chatName = item.textContent.trim();
            state.currentChat = chatName;
            loadMessagesForChat(chatName);
        });
    });

    // ЗАГРУЖАЕМ СООБЩЕНИЯ ДЛЯ ТЕКУЩЕГО ЧАТА
    loadMessagesForChat(state.currentChat);



// НАСТРАИВАЕМ ПОИСК
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const closeSearchBtn = document.getElementById('close-search-results');

if (searchInput && searchBtn) {
    // Поиск при нажатии на кнопку
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchMessages(query);
            highlightSearchResults();
            renderSearchResults();
        } else {
            clearSearch();
        }
    });
    
    // Поиск при нажатии Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchMessages(query);
                highlightSearchResults();
                renderSearchResults();
            } else {
                clearSearch();
            }
        }
    });
    
    // Закрытие результатов поиска
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            clearSearch();
            if (searchInput) searchInput.value = '';
        });
    }
}
}

// ЗАГРУЗКА СООБЩЕНИЙ ДЛЯ ВЫБРАННОГО ЧАТА
function loadMessagesForChat(chatName) {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = '';

        const messages = getMessages(chatName);

        if (messages.length > 0) {
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.type}`;
                
                // Текст сообщения
                if (msg.text) {
                    const textDiv = document.createElement('div');
                    textDiv.className = 'text';
                    textDiv.textContent = msg.text;
                    messageDiv.appendChild(textDiv);
                }
                
                // Если есть файлы, отображаем их
                if (msg.files && msg.files.length > 0) {
                    const filesContainer = document.createElement('div');
                    filesContainer.className = 'message-files';
                    
                    msg.files.forEach(fileData => {
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
                
                // Мета-информация
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
        }
    }


    // ЗАГРУЗКА СООБЩЕНИЙ ДЛЯ ВЫБРАННОГО ЧАТА
    function loadMessagesForChat(chatName) {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = '';

        const messages = getMessages(chatName);

        if (messages.length > 0) {
            messages.forEach(msg => {
                // ... существующий код создания сообщений ...
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // ВОССТАНАВЛИВАЕМ ПОДСВЕТКУ ПОИСКА
            // После загрузки сообщений, если есть активный поиск, восстанавливаем его
            setTimeout(() => {
                if (searchState.query) {
                    renderSearchResults();
                    highlightSearchResults();
                    }
            }, 100);
        }
    }
    }
}

export { setupChatHandlers, loadMessagesForChat };