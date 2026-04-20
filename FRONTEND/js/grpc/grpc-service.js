// js/grpc/grpc-service.js
import client from './grpc-client.js';
import { state } from '../app.js';


const Metadata = window.grpc?.Metadata || (client && client.Metadata);

class GrpcService {
    constructor() {
        this.client = client;
        this.stream = null; // Один стрим для всех чатов
        this.onMessageCallback = null; // Храним колбэк
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

    // Запускаем ОДИН стрим для всех чатов
    // js/grpc/grpc-service.js

startGlobalStream(onMessage) {
    this.onMessageCallback = onMessage;
    
    if (this.stream) {
        console.log('⚠️ Глобальный стрим уже существует');
        return this.stream;
    }

    const metadata = new Metadata();
    if (state.token) {
        metadata.add('authorization', `Bearer ${state.token}`);
    }

    // Получаем список ID чатов из state
    const chatIds = state.chats?.map(chat => chat.id) || [];
    
    if (chatIds.length === 0) {
        console.log(' Нет чатов для стрима, откладываем запуск');
        // Подождём, пока загрузятся чаты
        setTimeout(() => {
            if (state.chats?.length > 0) {
                this.startGlobalStream(onMessage);
            }
        }, 2000);
        return null;
    }
    
    console.log(`Запуск глобального стрима для чатов:`, chatIds);
    
    try {
        this.stream = this.client.StreamMessages({ chat_ids: chatIds }, metadata);
        
        this.stream.on('data', (message) => {
            console.log(`Новое сообщение в чате ${message.chat_id}:`, message);
            if (this.onMessageCallback) {
                this.onMessageCallback(message);
            }
        });
        
        this.stream.on('error', (error) => {
            if (error.code === 1) {
                console.log(`Глобальный стрим был остановлен`);
                this.stream = null;
                return;
            }
            console.error(`Ошибка глобального стрима:`, error);
            // Переподключаемся через 5 секунд
            setTimeout(() => {
                console.log(`Переподключение глобального стрима...`);
                this.startGlobalStream(this.onMessageCallback);
            }, 5000);
        });
        
        this.stream.on('end', () => {
            console.log(`Глобальный стрим завершен сервером`);
            this.stream = null;
            // Не переподключаемся сразу, дадим время
            setTimeout(() => {
                if (state.chats?.length > 0) {
                    console.log(`Переподключение глобального стрима...`);
                    this.startGlobalStream(this.onMessageCallback);
                }
            }, 3000);
        });
        
        return this.stream;
        
    } catch (error) {
        console.error(`Ошибка создания глобального стрима:`, error);
        this.stream = null;
        throw error;
    }
}

    // Остановка глобального стрима (только при выходе)
    stopGlobalStream() {
        if (this.stream) {
            console.log(` Остановка глобального стрима`);
            this.stream.removeAllListeners();
            this.stream.cancel();
            this.stream = null;
            this.onMessageCallback = null;
        }
    }

    // Старые методы для обратной совместимости
    startMessageStream(chatId, onMessage, onError, onEnd) {
        // Просто вызываем глобальный стрим
        return this.startGlobalStream(onMessage);
    }

    stopMessageStream(chatId) {
        // Не останавливаем стрим при переключении чата
        console.log(`stopMessageStream вызван для ${chatId}, но стрим не останавливается`);
    }

    stopAllStreams() {
        this.stopGlobalStream();
    }
}

const grpcService = new GrpcService();
export default grpcService;