// js/handlers/chat/index.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { showCreateGroupModal } from '../groupHandlers.js';

import { 
    initGrpc, 
    loadChatsFromServer, 
    setCurrentChat,
    getCurrentChat,
    createNewChat,
    cleanupChatResources
} from './chat-core.js';

import { 
    updateChatAreaUI, 
    setupAvatar,
    showErrorMessage 
} from './chat-ui.js';

import { 
    loadMessagesFromServer,
    appendNewMessage,
    stopMessageStreamForChat,
    stopAllMessageStreams,
    startMessageStreamForChat
} from './chat-messages.js';

import { 
    setupFileAttachment,
    clearAttachedFiles 
} from './chat-files.js';

import { 
    setupMessageSending,
    sendMessage 
} from './chat-message-send.js';

import { 
    setupSearch 
} from './chat-search.js';

import { 
    setupEmojiPanel 
} from './chat-emoji.js';

let isChatInitialized = false;

export {
    initGrpc,
    loadChatsFromServer,
    setCurrentChat,
    getCurrentChat,
    createNewChat,
    cleanupChatResources,
    updateChatAreaUI,
    setupAvatar,
    showErrorMessage,
    loadMessagesFromServer,
    appendNewMessage,
    stopMessageStreamForChat,
    stopAllMessageStreams,
    startMessageStreamForChat,
    setupFileAttachment,
    clearAttachedFiles,
    setupMessageSending,
    sendMessage,
    setupSearch,
    setupEmojiPanel
};

function setupCreateGroupButton() {
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        const newBtn = createGroupBtn.cloneNode(true);
        createGroupBtn.parentNode.replaceChild(newBtn, createGroupBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showCreateGroupModal();
        });
    }
}

function updateUserInfo() {
    const userEmail = document.getElementById('user-email');
    if (userEmail && state.currentUser) {
        userEmail.textContent = state.currentUser.email;
        console.log('✅ Email пользователя обновлен:', state.currentUser.email);
    }
    
    const chatAvatar = document.getElementById('chat-avatar');
    if (chatAvatar && state.userAvatar) {
        chatAvatar.src = state.userAvatar;
    } else if (chatAvatar) {
        const savedAvatar = localStorage.getItem('userAvatar');
        if (savedAvatar) {
            state.userAvatar = savedAvatar;
            chatAvatar.src = savedAvatar;
        }
    }
}

export function resetChatInitialization() {
    isChatInitialized = false;
    console.log('🔄 Флаг инициализации чата сброшен');
}

export async function setupChatHandlers() {
    console.log('📱 setupChatHandlers вызван, isChatInitialized:', isChatInitialized);
    
    // ВСЕГДА обновляем информацию о пользователе
    updateUserInfo();
    
    // ВСЕГДА останавливаем старые стримы
    await stopAllMessageStreams();
    
    // ВСЕГДА загружаем чаты заново
    await loadChatsFromServer();
    
    // Если уже был инициализирован, пересоздаем обработчики
    if (isChatInitialized) {
        console.log('🔄 Пересоздание обработчиков чата...');
        
        // Пересоздаем обработчики (удаляем старые и создаем новые)
        setupAvatar();
        setupCreateGroupButton();
        setupFileAttachment();
        setupMessageSending();
        setupSearch();
        setupEmojiPanel();
    } else {
        console.log('📱 Первая инициализация чата');
        
        setupAvatar();
        setupCreateGroupButton();
        setupFileAttachment();
        setupMessageSending();
        setupSearch();
        setupEmojiPanel();
        
        isChatInitialized = true;
    }
    
    // Обновляем UI
    await updateChatAreaUI();
    
    console.log('✅ Чат полностью инициализирован/обновлен');
}