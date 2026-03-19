// js/grpc/grpc-service.js
import client from './grpc-client.js';
import { state } from '../app.js';

// Получаем Metadata из глобальной области или создаем
const Metadata = window.grpc?.Metadata || client.Metadata;

class GrpcService {
    constructor() {
        this.client = client;
        this.streams = new Map();
    }

    #call(method, request) {
        return new Promise((resolve, reject) => {
            const metadata = new Metadata();
            if (state.token) {
                metadata.add('authorization', `Bearer ${state.token}`);
            }

            this.client[method](request, metadata, (error, response) => {
                if (error) {
                    console.error(`❌ Ошибка ${method}:`, error);
                    
                    let errorMessage = 'Ошибка соединения с сервером';
                    if (error.code === 14) errorMessage = 'Сервер недоступен';
                    else if (error.code === 5) errorMessage = 'Не найден';
                    else if (error.code === 16) errorMessage = 'Не авторизован';
                    
                    reject(new Error(errorMessage));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async stub() {
        return this.#call('Stub', { });
    }
    
    async login(email, password) {
        return this.#call('Login', { email, password });
    }

    async getChats() {
        return this.#call('GetChats', {});
    }

    async getMessages(chatId, limit = 50, cursor = '') {
        return this.#call('GetMessages', {
            chat_id: chatId,
            limit: limit,
            cursor: cursor
        });
    }

    async sendMessage(chatId, text, type = 0, fileId = '') {
        if (!state.currentUser) {
            throw new Error('Пользователь не авторизован');
        }

        return this.#call('SendMessage', {
            chat_id: chatId,
            type: type,
            text: text,
            file_id: fileId,
            sender_id: state.currentUser.id
        });
    }

    startMessageStream(chatIds, onMessage, onError, onEnd) {
        this.stopMessageStream();
        
        const metadata = new Metadata();
        if (state.token) {
            metadata.add('authorization', `Bearer ${state.token}`);
        }

        const stream = this.client.StreamMessages({ chat_ids: chatIds }, metadata);
        
        stream.on('data', (message) => {
            console.log('📩 Новое сообщение через стрим:', message);
            if (onMessage) onMessage(message);
        });
        
        stream.on('error', (error) => {
            console.error('❌ Ошибка стрима:', error);
            if (onError) onError(error);
        });
        
        stream.on('end', () => {
            console.log('📴 Стрим завершен');
            this.streams.delete('messages');
            if (onEnd) onEnd();
        });
        
        this.streams.set('messages', stream);
        return stream;
    }

    stopMessageStream() {
        const stream = this.streams.get('messages');
        if (stream) {
            stream.cancel();
            this.streams.delete('messages');
        }
    }
}

const grpcService = new GrpcService();
export default grpcService;