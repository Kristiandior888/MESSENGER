// js/utils/chatUtils.js
import { state } from '../app.js';

export function isGroupChat(chat) {
    return chat?.type === 'GROUP' || chat?.type === 1;
}

export function isPrivateChat(chat) {
    return !isGroupChat(chat);
}


export function getChatDisplayName(chat) {
    if (!chat) return 'Чат';

    // Групповой чат
    if (isGroupChat(chat)) {
        return chat.name || 'Групповой чат';
    }

    // Личный чат — пробуем разные источники имени собеседника

    // 1. Уже закэшированное имя (заполняется в loadChatsFromServer)
    if (chat.other_user_name && chat.other_user_name.trim() !== '') {
        return chat.other_user_name;
    }

    // 2. Email собеседника
    if (chat.other_user_email && chat.other_user_email.trim() !== '') {
        return chat.other_user_email.split('@')[0];
    }

    // 3. Из participants (для чатов, где participants заполнены)
    if (Array.isArray(chat.participants) && chat.participants.length > 0) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (other) {
            if (other.name) return other.name;
            if (other.email) return other.email.split('@')[0];
        }
    }

    // 4. Из ID чата (формат `userA_userB`) — fallback
    if (chat.id && state.currentUser) {
        const parts = chat.id.split('_');
        for (const part of parts) {
            if (part !== state.currentUser.id && part.length > 5) {
                return `Пользователь ${part.slice(-8)}`;
            }
        }
    }

    // 5. Совсем fallback
    return chat.name || 'Диалог';
}


export function getChatDisplayEmail(chat) {
    if (!chat || isGroupChat(chat)) return null;

    if (chat.other_user_email) return chat.other_user_email;

    if (Array.isArray(chat.participants)) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (other?.email) return other.email;
    }

    return null;
}


export function getOtherParticipantId(chat) {
    if (!chat || isGroupChat(chat)) return null;

    if (chat.other_user_id) return chat.other_user_id;

    if (Array.isArray(chat.participants)) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        if (other?.id) return other.id;
    }

    return null;
}


export function getChatAvatarUrl(chat) {
    if (!chat) return null;
    if (chat.avatar_url) return chat.avatar_url;

    if (!isGroupChat(chat) && Array.isArray(chat.participants)) {
        const other = chat.participants.find(p => p.id !== state.currentUser?.id);
        return other?.avatar_url || null;
    }
    return null;
}

export function getGroupParticipantsCount(chat) {
    if (!isGroupChat(chat)) return 0;
    return chat.participants?.length || 0;
}