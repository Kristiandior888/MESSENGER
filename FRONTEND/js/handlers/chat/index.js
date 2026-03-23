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
    stopAllMessageStreams
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

export function resetChatInitialization() {
    isChatInitialized = false;
    console.log('🔄 Флаг инициализации чата сброшен');
}

export async function setupChatHandlers() {
    if (isChatInitialized) {
        console.log('⚠️ Чат уже был инициализирован, пропускаем');
        return;
    }
    
    console.log('📱 Чат загружен!');

    await loadChatsFromServer();

    const userEmail = document.getElementById('user-email');
    if (userEmail && state.currentUser) {
        userEmail.textContent = state.currentUser.email;
    }

    setupAvatar();
    setupCreateGroupButton();
    setupFileAttachment();
    setupMessageSending();
    setupSearch();
    setupEmojiPanel();

    updateChatAreaUI();
    
    isChatInitialized = true;
    console.log('✅ Чат полностью инициализирован');
}