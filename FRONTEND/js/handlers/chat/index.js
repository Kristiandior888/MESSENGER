// js/handlers/chat/index.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { showCreateGroupModal } from '../groups/index.js';

import { 
    initGrpc, 
    loadChatsFromServer, 
    setCurrentChat,
    getCurrentChat,
    createRealChatWithUser,
    cleanupChatResources,
    refreshChatsList,
    refreshAllChatNames,
    loadAllUsersFromServer
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
    resetMessagesState,
    startGlobalMessageStream,
    stopGlobalMessageStream
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
    createRealChatWithUser,
    cleanupChatResources,
    updateChatAreaUI,
    setupAvatar,
    showErrorMessage,
    loadMessagesFromServer,
    appendNewMessage,
    stopMessageStreamForChat,
    stopAllMessageStreams,
    setupFileAttachment,
    clearAttachedFiles,
    setupMessageSending,
    sendMessage,
    setupSearch,
    setupEmojiPanel,
    startGlobalMessageStream,
    stopGlobalMessageStream
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
        console.log('Email пользователя обновлен:', state.currentUser.email);
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
    updateUserInfo();
    
    // Останавливаем старый стрим если был (важно!)
    await stopGlobalMessageStream();
    
    // Небольшая задержка для корректного завершения
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Загружаем чаты (внутри загружаются и пользователи)
    await loadChatsFromServer();
    
    // Настройка UI
    updateUserInfo();
    setupAvatar();
    setupCreateGroupButton();
    setupFileAttachment();
    setupMessageSending();
    setupSearch();
    setupEmojiPanel();
    
    // Обновляем область чата
    await updateChatAreaUI();
    
    // Запускаем стрим если есть чаты и не в процессе завершения
    if (state.chats && state.chats.length > 0) {
        await startGlobalMessageStream();
    } else {
        console.log('Нет чатов, стрим не запущен');
    }
    
    isChatInitialized = true;
    console.log('✅ Чат полностью инициализирован');
}