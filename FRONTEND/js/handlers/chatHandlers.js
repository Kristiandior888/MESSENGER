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
    renderSearchResults,
    searchState 
} from '../utils/searchUtils.js';
import { showCreateGroupModal, updateChatsList, showChatContextMenu } from './groupHandlers.js';
import { renderEmojiPanel } from '../utils/emojiUtils.js';


// НАСТРОЙКА ЭКРАНА ЧАТА
function setupChatHandlers() {
    console.log('Чат загружен!');

    const userEmail = document.getElementById('user-email');
    if (userEmail && state.currentUser) {
        userEmail.textContent = state.currentUser.email;
    }

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

    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showCreateGroupModal();
        });
    }

    const attachBtn = document.getElementById('attach-btn');
    const fileUpload = document.getElementById('file-upload');
    let attachedFiles = [];

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
                    console.log(`Файл прикреплен: ${file.name}`);
                } catch (error) {
                    console.error('Ошибка при загрузке файла:', error);
                    alert(`Не удалось загрузить файл ${file.name}`);
                }
            }
            
            fileUpload.value = '';
            updateAttachedFilesIndicator(attachedFiles);
        });
    }

    function updateAttachedFilesIndicator(files) {
        const btn = document.getElementById('attach-btn');
        if (btn) {
            if (files.length > 0) {
                btn.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
                btn.style.borderColor = '#d4af37';
                btn.title = `${files.length} файл(ов) прикреплено`;
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.borderColor = '#3a424c';
                btn.title = 'Прикрепить файл';
            }
        }
    }

    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');

    if (sendBtn && messageField) {
        const sendMessage = () => {
            const text = messageField.value.trim();
            
            if (text || attachedFiles.length > 0) {
                const filesToSend = [...attachedFiles];
                attachedFiles = [];
                updateAttachedFilesIndicator(attachedFiles);
                
                addMessage(text, 'sent', true, 'sending', filesToSend);
                messageField.value = '';
                
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

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            state.isAuthenticated = false;
            state.currentUser = null;
            showScreen('login');
        });
    }

    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            chatItems.forEach(ci => ci.classList.remove('active'));
            item.classList.add('active');

            const chatId = item.getAttribute('data-chat-id');
            if (chatId) {
                state.currentChat = chatId;
                loadMessagesForChat(chatId);
            } else {
                const chatName = item.textContent.trim();
                state.currentChat = chatName;
                loadMessagesForChat(chatName);
            }
        });
        
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const chatId = item.getAttribute('data-chat-id');
            if (chatId) {
                const chat = state.chats.find(c => c.id === chatId);
                if (chat) {
                    showChatContextMenu(e, chat);
                }
            }
        });
    });

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const closeSearchBtn = document.getElementById('close-search-results');

    if (searchInput && searchBtn) {
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
        
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => {
                clearSearch();
                if (searchInput) searchInput.value = '';
            });
        }
    }

    updateChatsList();
    loadMessagesForChat(state.currentChat);

        // НАСТРАИВАЕМ ПАНЕЛЬ ЭМОДЗИ
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji-panel');
const emojiContainer = document.getElementById('emoji-container');
const categoryBtns = document.querySelectorAll('.emoji-category');

if (emojiBtn && emojiPanel && emojiContainer) {
    // Открытие/закрытие панели
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = emojiPanel.style.display === 'flex';
        
        if (!isVisible) {
            // Позиционируем панель над кнопкой
            const btnRect = emojiBtn.getBoundingClientRect();
            
            // Рассчитываем позицию
            const panelWidth = 350; // ширина панели из CSS
            const windowWidth = window.innerWidth;
            
            let left = btnRect.left;
            
            // Если панель выходит за правый край экрана
            if (left + panelWidth > windowWidth) {
                left = windowWidth - panelWidth - 10; // Отступ от края 10px
            }
            
            // Если панель выходит за левый край экрана
            if (left < 10) {
                left = 10;
            }
            
            // Устанавливаем позицию
            emojiPanel.style.position = 'fixed';
            emojiPanel.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px'; // 10px отступа сверху от кнопки
            emojiPanel.style.left = left + 'px';
            emojiPanel.style.display = 'flex';
            
            // Загружаем недавние эмодзи по умолчанию
            renderEmojiPanel(emojiContainer, 'recent');
        } else {
            emojiPanel.style.display = 'none';
        }
    });
    
    // Переключение категорий
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
    
    // Закрытие при прокрутке
    window.addEventListener('scroll', () => {
        if (emojiPanel.style.display === 'flex') {
            emojiPanel.style.display = 'none';
        }
    });
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
                    renderSearchResults();
                    highlightSearchResults();
                }
            }, 100);
        }
    }
}

export { setupChatHandlers, loadMessagesForChat };