// js/grpc/grpc-service.js
import client from './grpc-client.js';
import { state } from '../app.js';

const Metadata = window.grpc?.Metadata || (client && client.Metadata);

class GrpcService {
    constructor() {
        this.client = client;
        this.streams = new Map();
    }

    #call(method, request, skipAuth = false) {
        return new Promise((resolve, reject) => {
            const metadata = new Metadata();
            if (!skipAuth && state.token) {
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

    async login(email, password) {
        return this.#call('Login', { email, password }, true);
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
        });
    }

    startMessageStream(chatId, onMessage, onError, onEnd) {
    const metadata = new Metadata();
    if (state.token) {
        metadata.add('authorization', `Bearer ${state.token}`);
    }

    console.log(`📡 Запуск стрима для чата: ${chatId}`);
    
    try {
        const stream = this.client.StreamMessages({ chat_ids: [chatId] }, metadata);
        
        stream.on('data', (message) => {
            console.log(`📩 Новое сообщение в чате ${chatId}:`, message);
            if (onMessage) onMessage(message);
        });
        
        stream.on('error', (error) => {
            if (error.code === 1) {
                console.log(`📴 Стрим для чата ${chatId} был остановлен`);
                this.streams.delete(chatId);
                return;
            }
            console.error(`❌ Ошибка стрима для чата ${chatId}:`, error);
            if (onError) onError(error);
        });
        
        stream.on('end', () => {
            console.log(`📴 Стрим для чата ${chatId} завершен сервером`);
            this.streams.delete(chatId);
            if (onEnd) onEnd();
        });
        
        this.streams.set(chatId, stream);
        return stream;
        
    } catch (error) {
        console.error(`❌ Ошибка создания стрима для чата ${chatId}:`, error);
        throw error;
    }
    }

    stopMessageStream(chatId) {
        const stream = this.streams.get(chatId);
        if (stream) {
            console.log(`🛑 Остановка стрима для чата ${chatId}`);
            
            // Удаляем обработчики, чтобы избежать лишних вызовов
            stream.removeAllListeners('data');
            stream.removeAllListeners('error');
            stream.removeAllListeners('end');
            
            try {
                stream.cancel();
            } catch (e) {
                // Игнорируем ошибку CANCELLED
                if (e.code !== 1) {
                    console.warn(`Ошибка при отмене стрима ${chatId}:`, e);
                }
            }
            this.streams.delete(chatId);
        }
    }
}

const grpcService = new GrpcService();
export default grpcService;