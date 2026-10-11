// js/handlers/chat/chat-core.js
import { state } from '../../app.js';
import { updateChatAreaUI } from './chat-ui.js';
import { stopAllMessageStreams } from './chat-messages.js';

// gRPC — из отдельного модуля
export { initGrpc } from './grpc-init.js';

// Реэкспорт из chat-users.js
export {
    loadAllUsersFromServer,
    loadAllUsersMap,
    fetchAndCacheUserData,
    fetchAndCacheUserName,
    getAllUsersFromCache,
    getCachedUserName,
    getCachedUserEmail,
    refreshAllChatNames,
} from './chat-users.js';

// Реэкспорт из chat-list.js
export {
    loadChatsFromServer,
    createRealChatWithUser,
} from './chat-list.js';

// Реэкспорт из chatUtils.js
export {
    getChatDisplayName,
    getChatDisplayEmail,
    isGroupChat,
    getOtherParticipantId,
} from '../../utils/chatUtils.js';

// ============================================================
//  Текущий чат
// ============================================================

let currentChatId = null;

export async function setCurrentChat(chatId) {
    console.log(`Установка текущего чата: ${chatId}`);
    state.currentChat = chatId;
    currentChatId = chatId;
    await updateChatAreaUI();
}

export function getCurrentChat() {
    return state.currentChat || currentChatId;
}

export async function cleanupChatResources() {
    await stopAllMessageStreams();
    currentChatId = null;
    state.currentChat = null;
}