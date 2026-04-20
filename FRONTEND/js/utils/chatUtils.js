// js/utils/chatUtils.js
import { state } from '../app.js';

export function getChatDisplayName(chat) {
    if (!chat) return 'Чат';
    
    // Групповой чат
    if (chat.type === 1) {
        return chat.name || 'Групповой чат';
    }
    
    // Личный чат - показываем имя собеседника
    if (chat.participants?.length) {
        const otherParticipant = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (otherParticipant) {
            return otherParticipant.name || otherParticipant.email?.split('@')[0] || 'Собеседник';
        }
    }
    
    return chat.name || 'Диалог';
}

export function isGroupChat(chat) {
    return chat?.type === 1;
}

export function getOtherParticipantId(chat) {
    if (isGroupChat(chat)) return null;
    const other = chat.participants?.find(p => p.id !== state.currentUser?.id);
    return other?.id || null;
}