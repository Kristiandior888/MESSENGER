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

    async sendMessage(chatId, { text = '', file = null }) {
    if (!state.currentUser) {
        throw new Error('Пользователь не авторизован');
    }

    let type = 0; // TEXT
    let fileId = '';

    if (file) {
        console.log('📤 Загружаем файл на сервер...');
        try {
            fileId = await this.uploadFile(file);
            type = 1; // FILE
            console.log('✅ Файл загружен, file_id:', fileId);
        } catch (uploadError) {
            console.error('❌ Ошибка загрузки файла:', uploadError);
            throw new Error('Не удалось загрузить файл: ' + uploadError.message);
        }
    }

    console.log('📤 Отправляем сообщение:', {
        chat_id: chatId,
        type: type,
        text: text,
        file_id: fileId,
        sender_id: state.currentUser.id
    });

    return this.#call('SendMessage', {
        chat_id: chatId,
        type: type,
        text: text,
        file_id: fileId,
        sender_id: state.currentUser.id
    });
}

    async uploadFile(file) {
    return new Promise((resolve, reject) => {
        const metadata = new Metadata();
        if (state.token) {
            metadata.add('authorization', `Bearer ${state.token}`);
        }
        
        // Кодируем имя файла в base64 или URL encode
        const encodedFileName = encodeURIComponent(file.name);
        metadata.add('file-name', encodedFileName);
        
        console.log('📤 Начинаем загрузку файла:', {
            originalName: file.name,
            encodedName: encodedFileName,
            type: file.type,
            size: file.size
        });

        const stream = this.client.UploadFile(metadata, (err, response) => {
            if (err) {
                console.error('❌ Ошибка загрузки файла:', err);
                reject(err);
            } else {
                console.log('✅ Файл загружен, ID:', response.file_id);
                resolve(response.file_id);
            }
        });

        stream.on('error', (err) => {
            console.error('❌ Ошибка стрима загрузки:', err);
            reject(err);
        });

        const chunkSize = 64 * 1024;
        let offset = 0;

        const reader = new FileReader();

        reader.onload = () => {
            const buffer = new Uint8Array(reader.result);

            while (offset < buffer.length) {
                const chunk = buffer.slice(offset, offset + chunkSize);
                stream.write({
                    chunk: chunk,
                    file_name: encodedFileName // Используем закодированное имя
                });
                offset += chunkSize;
            }

            stream.end();
        };

        reader.onerror = (err) => {
            console.error('❌ Ошибка чтения файла:', err);
            reject(err);
        };

        reader.readAsArrayBuffer(file);
    });
}

    async downloadFile(fileId) {
        const metadata = new Metadata();
        if (state.token) {
            metadata.add('authorization', `Bearer ${state.token}`);
        }

        return new Promise((resolve, reject) => {
            const stream = this.client.DownloadFile({ file_id: fileId }, metadata);

            const chunks = [];

            stream.on('data', (response) => {
                chunks.push(response.chunk);
            });

            stream.on('end', () => {
                const blob = new Blob(chunks);
                resolve(blob);
            });

            stream.on('error', reject);
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
}

const grpcService = new GrpcService();
export default grpcService;