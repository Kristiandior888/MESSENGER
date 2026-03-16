// js/grpc/grpc-stream.js
import client from './grpc-client.js';
import { addMessage } from '../utils/messageUtils.js';
import { state } from '../app.js';

let stream = null;

export function startMessageStream(chatIds, onMessageCallback) {
    if (stream) {
        stream.cancel();
    }
    
    stream = client.StreamMessages({ chat_ids: chatIds });
    
    stream.on('data', (message) => {
        console.log('📩 Новое сообщение через стрим:', message);
        
        const messageType = message.sender_id === state.currentUser?.id ? 'sent' : 'received';
        
        addMessage(message.text, messageType, true, message.status?.toLowerCase());
        
        if (onMessageCallback) onMessageCallback(message);
    });
    
    stream.on('error', (error) => {
        console.error('Ошибка стрима:', error);
    });
    
    stream.on('end', () => {
        console.log('Стрим завершен');
    });
}

export function stopMessageStream() {
    if (stream) {
        stream.cancel();
        stream = null;
    }
}