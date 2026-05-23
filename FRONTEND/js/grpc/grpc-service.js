// js/grpc/grpc-service.js
import client from './grpc-client.js';
import { state } from '../app.js';

const Metadata = window.grpc?.Metadata || (client && client.Metadata);

class GrpcService {
    constructor() {
        this.client = client;
        this.stream = null;
        this.onMessageCallback = null;
    }

    // Метод для обновления адреса сервера
    async updateServerAddress(ipAddress) {
        if (this.client.updateAddress) {
            this.client.updateAddress(ipAddress);
            console.log('✅ Адрес сервера обновлен в сервисе:', ipAddress);
            
            // Сохраняем в localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('serverIp', ipAddress);
            }
            
            // Перезапускаем стрим если он был активен
            if (this.stream) {
                this.stopGlobalStream();
                if (this.onMessageCallback) {
                    setTimeout(() => {
                        this.startGlobalStream(this.onMessageCallback);
                    }, 1000);
                }
            }
            return true;
        }
        return false;
    }

    #call(method, request, skipAuth = false) {
        return new Promise((resolve, reject) => {
            const metadata = new Metadata();
            if (!skipAuth && state.token) {
                metadata.add('authorization', `Bearer ${state.token}`);
            }

            if (typeof this.client[method] !== 'function') {
                console.error(`❌ Метод ${method} не существует в клиенте`);
                reject(new Error(`Метод ${method} не реализован на сервере`));
                return;
            }

            this.client[method](request, metadata, (error, response) => {
                if (error) {
                    console.error(`❌ Ошибка ${method}:`, error);
                    
                    let errorMessage = 'Ошибка соединения с сервером';
                    if (error.code === 14) errorMessage = 'Сервер недоступен. Проверьте IP адрес';
                    else if (error.code === 5) errorMessage = 'Пользователь не найден';
                    else if (error.code === 16) errorMessage = 'Не авторизован';
                    else if (error.message) errorMessage = error.message;
                    
                    reject(new Error(errorMessage));
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Email authentication
    async requestEmailCode(email) {
        return this.#call('RequestEmailCode', { email }, true);
    }

    async verifyEmailCode(email, code) {
        return this.#call('VerifyEmailCode', { email, code }, true);
    }

    // Chats
    async getChats() {
        return this.#call('GetChats', {});
    }

    async createChat(type, name, participantIds) {
        const request = {
            type: type,
            name: name || '',
            participant_ids: participantIds || []
        };
        console.log('📤 CreateChat запрос:', request);
        return this.#call('CreateChat', request);
    }

    // Messages
    async getMessages(chatId, limit = 50, cursor = '') {
        return this.#call('GetMessages', {
            chat_id: chatId,
            limit: limit,
            cursor: cursor
        });
    }

    async sendMessage(chatId, text, type = 0, fileIds = []) {
        if (!state.currentUser) {
            throw new Error('Пользователь не авторизован');
        }

        const fileId = fileIds.length > 0 ? fileIds[0] : '';
        
        return this.#call('SendMessage', {
            chat_id: chatId,
            type: type,
            text: text,
            file_id: fileId,
        });
    }

    // Users
    async getUser(userId) {
        return this.#call('GetUser', { id: userId });
    }

    async getUsers(search = '') {
        return this.#call('GetUsers', { search: search });
    }

    /**
     * Загрузка файла на сервер
     */
    uploadFile(file) {
        return new Promise((resolve, reject) => {
            const metadata = new Metadata();
            if (state.token) {
                metadata.add('authorization', `Bearer ${state.token}`);
            }

            if (typeof this.client.UploadFile !== 'function') {
                const fakeId = `local_${Date.now()}_${file.name}`;
                resolve(fakeId);
                return;
            }

            const call = this.client.UploadFile(metadata, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка загрузки файла:', error);
                    reject(new Error('Не удалось загрузить файл на сервер'));
                } else {
                    console.log('✅ Файл загружен, file_id:', response.file_id);
                    resolve(response.file_id);
                }
            });

            call.write({
                metadata: {
                    file_name: file.name,
                    content_type: file.type || 'application/octet-stream',
                }
            });

            const CHUNK_SIZE = 64 * 1024;
            const reader = new FileReader();
            let offset = 0;

            const readNextChunk = () => {
                if (offset >= file.size) {
                    call.end();
                    return;
                }

                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            };

            reader.onload = (e) => {
                const chunk = new Uint8Array(e.target.result);
                call.write({ chunk });
                offset += chunk.byteLength;
                readNextChunk();
            };

            reader.onerror = (e) => {
                console.error('❌ Ошибка чтения файла:', e);
                call.cancel();
                reject(new Error('Ошибка чтения файла'));
            };

            readNextChunk();
        });
    }

    async uploadFiles(files) {
        const fileIds = [];
        for (const file of files) {
            const fileId = await this.uploadFile(file);
            fileIds.push(fileId);
        }
        return fileIds;
    }

    // Stream
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

        const chatIds = state.chats?.map(chat => chat.id).filter(id => !id.startsWith('temp_')) || [];
        
        if (chatIds.length === 0) {
            console.log('Нет чатов для стрима, откладываем запуск');
            setTimeout(() => {
                if (state.chats?.length > 0) {
                    this.startGlobalStream(onMessage);
                }
            }, 2000);
            return null;
        }
        
        console.log(`Запуск глобального стрима для чатов:`, chatIds);
        
        try {
            if (typeof this.client.StreamMessages !== 'function') {
                console.warn('⚠️ Метод StreamMessages не реализован на сервере');
                return null;
            }
            
            this.stream = this.client.StreamMessages({ chat_ids: chatIds }, metadata);
            
            this.stream.on('data', (message) => {
                console.log(`📨 Новое сообщение в чате ${message.chat_id}:`, message);
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
                setTimeout(() => {
                    console.log(`Переподключение глобального стрима...`);
                    this.startGlobalStream(this.onMessageCallback);
                }, 5000);
            });
            
            this.stream.on('end', () => {
                console.log(`Глобальный стрим завершен сервером`);
                this.stream = null;
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

    stopGlobalStream() {
        if (this.stream) {
            console.log(`Остановка глобального стрима`);
            this.stream.removeAllListeners();
            this.stream.cancel();
            this.stream = null;
            this.onMessageCallback = null;
        }
    }

    startMessageStream(chatId, onMessage, onError, onEnd) {
        return this.startGlobalStream(onMessage);
    }

    stopMessageStream(chatId) {
        console.log(`stopMessageStream вызван для ${chatId}`);
    }

    stopAllStreams() {
        this.stopGlobalStream();
    }
}

const grpcService = new GrpcService();

console.log('🔍 Доступные методы gRPC клиента:', 
    Object.keys(grpcService.client || {})
        .filter(key => typeof grpcService.client[key] === 'function')
);

export default grpcService;