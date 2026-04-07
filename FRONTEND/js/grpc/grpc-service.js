// js/grpc/grpc-service.js
import client from './grpc-client.js';
import { state } from '../app.js';

const Metadata = window.grpc?.Metadata || (client && client.Metadata);

class GrpcService {
    constructor() {
        this.client = client;
        this.streams = new Map();
        this.activeStreams = new Map(); // Для отслеживания активных стримов
    }

    #call(method, request, skipAuth = false) {
        return new Promise((resolve, reject) => {
            const metadata = new Metadata();
            if (!skipAuth && state.token) {
                metadata.add('authorization', `Bearer ${state.token}`);
            }

            this.client[method](request, metadata, async (error, response) => {
                if (error) {
                    // 🔥 JWT истёк → пробуем обновить
                    if (error.code === 16 && !skipAuth) {
                        try {
                            console.log('🔄 JWT истёк, обновляем...');

                            const newToken = await this.refreshToken();

                            const retryMetadata = new Metadata();
                            retryMetadata.add('authorization', `Bearer ${newToken}`);

                            this.client[method](request, retryMetadata, (err2, res2) => {
                                if (err2) return reject(err2);
                                resolve(res2);
                            });

                            return;
                        } catch (refreshError) {
                            console.error('❌ Refresh не удался:', refreshError);
                            reject(new Error('Сессия истекла'));
                            return;
                        }
                    }

                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    async login(email, password) {
        return this.#call('Login', { email, password }, true);
    }

    async logout() {
        try {
            await this.#call('Logout', {});
        } catch (e) {
            console.warn('Ошибка logout:', e);
        }

        // очищаем всё
        state.token = null;
        state.refreshToken = null;
        state.currentUser = null;

        localStorage.removeItem('jwt_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userData');
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
        // Сначала останавливаем существующий стрим для этого чата
        this.stopMessageStream(chatId);
        
        const metadata = new Metadata();
        if (state.token) {
            metadata.add('authorization', `Bearer ${state.token}`);
        }

        console.log(`📡 Запуск стрима для чата: ${chatId}`);
        
        // Создаем AbortController для управления отменой
        const abortController = new AbortController();
        
        try {
            const stream = this.client.StreamMessages({ chat_ids: [chatId] }, metadata);
            
            // Сохраняем контроллер для возможности отмены
            this.activeStreams.set(chatId, abortController);
            
            stream.on('data', (message) => {
                // Проверяем, не отменен ли стрим
                if (!abortController.signal.aborted) {
                    console.log(`📩 Новое сообщение в чате ${chatId}:`, message);
                    if (onMessage) onMessage(message);
                }
            });
            
            stream.on('error', (error) => {
                // Игнорируем ошибку отмены
                if (error.code === 1 && error.details === 'Cancelled on client') {
                    console.log(`📴 Стрим для чата ${chatId} был отменен клиентом`);
                    return;
                }
                console.error(`❌ Ошибка стрима для чата ${chatId}:`, error);
                if (onError && !abortController.signal.aborted) onError(error);
            });
            
            stream.on('end', () => {
                if (!abortController.signal.aborted) {
                    console.log(`📴 Стрим для чата ${chatId} завершен сервером`);
                }
                this.streams.delete(chatId);
                this.activeStreams.delete(chatId);
                if (onEnd && !abortController.signal.aborted) onEnd();
            });
            
            this.streams.set(chatId, stream);
            return stream;
            
        } catch (error) {
            console.error(`❌ Ошибка создания стрима для чата ${chatId}:`, error);
            this.activeStreams.delete(chatId);
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
            
            // Отменяем стрим
            stream.cancel();
            this.streams.delete(chatId);
        }
        
        // Очищаем активный контроллер
        this.activeStreams.delete(chatId);
    }

    stopAllStreams() {
        console.log(`🛑 Остановка всех стримов (${this.streams.size})`);
        this.streams.forEach((stream, chatId) => {
            stream.removeAllListeners('data');
            stream.removeAllListeners('error');
            stream.removeAllListeners('end');
            stream.cancel();
        });
        this.streams.clear();
        this.activeStreams.clear();
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            throw new Error('Нет refresh токена');
        }

        const response = await this.#call('RefreshToken', {
            refresh_token: refreshToken
        }, true);

        if (response.error) {
            throw new Error(response.error);
        }

        // обновляем токены
        state.token = response.jwt_token;
        state.refreshToken = response.refresh_token;

        localStorage.setItem('jwt_token', response.jwt_token);
        localStorage.setItem('refresh_token', response.refresh_token);

        return response.jwt_token;
    }
}

const grpcService = new GrpcService();
export default grpcService;