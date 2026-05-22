// admin/grpc-service.js
const { client, adminClient } = require('./grpc-client.js');
const grpc = require('@grpc/grpc-js');
const net = require('net');

let authToken = null;
let currentEmail = null;
let currentServerAddress = 'localhost:7212';

class AdminGrpcService {
    constructor() {
        this.client = client;
        this.adminClient = adminClient;
        console.log('📡 AdminGrpcService инициализирован');
    }

    updateServerAddress(address) {
        currentServerAddress = address;
        console.log('🔄 Обновление адреса сервера:', address);
        
        const grpc = require('@grpc/grpc-js');
        const protoLoader = require('@grpc/proto-loader');
        const path = require('path');
        
        const PROTO_PATH = path.join(__dirname, 'messenger.proto');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        const proto = grpc.loadPackageDefinition(packageDefinition);
        
        const credentials = grpc.credentials.createSsl(null, null, null, { rejectUnauthorized: false });
        
        this.client = new proto.messenger.Messenger(address, credentials);
        this.adminClient = new proto.messenger.Admin(address, credentials);
        
        console.log('✅ Адрес сервера обновлен на:', address);
    }

    async testConnection() {
        console.log('🔌 Проверка подключения к серверу...');
        
        const [host, port] = currentServerAddress.split(':');
        const portNum = parseInt(port) || 7212;
        
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                reject(new Error('Таймаут подключения'));
            }, 3000);
            
            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.destroy();
                console.log('✅ Сервер доступен');
                resolve(true);
            });
            
            socket.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error('Не удалось подключиться: ' + err.message));
            });
            
            socket.connect(portNum, host);
        });
    }

    setAuthToken(token) {
        authToken = token;
        console.log('🔑 Токен авторизации установлен');
    }

    getAuthToken() {
        return authToken;
    }

    setPendingEmail(email) {
        currentEmail = email;
    }

    getPendingEmail() {
        return currentEmail;
    }

    #getMetadata() {
        const metadata = new grpc.Metadata();
        if (authToken) {
            metadata.add('authorization', `Bearer ${authToken}`);
        }
        return metadata;
    }

    async getAllUsers() {
        console.log('📡 GetAllUsers...');
        
        return new Promise((resolve, reject) => {
            const metadata = this.#getMetadata();
            
            this.adminClient.GetAllUsers({}, metadata, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка GetAllUsers:', error.code, error.message);
                    reject(new Error(error.message));
                } else {
                    console.log('✅ GetAllUsers успешен');
                    resolve(response);
                }
            });
        });
    }

    async createUser(email, name) {
        console.log(`👤 Создание пользователя: ${email}, ${name}`);
        return new Promise((resolve, reject) => {
            const metadata = this.#getMetadata();
            
            this.adminClient.CreateUser({ email, name }, metadata, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка CreateUser:', error);
                    reject(new Error(error.message));
                } else {
                    console.log('✅ CreateUser успешен');
                    resolve(response);
                }
            });
        });
    }

    async editUser(userId, email, name) {
        console.log(`✏️ Редактирование пользователя: ${userId}`);
        return new Promise((resolve, reject) => {
            const metadata = this.#getMetadata();
            const request = { user_id: userId };
            if (email !== undefined) request.email = email;
            if (name !== undefined) request.name = name;
            
            this.adminClient.EditUser(request, metadata, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка EditUser:', error);
                    reject(new Error(error.message));
                } else {
                    console.log('✅ EditUser успешен');
                    resolve(response);
                }
            });
        });
    }

    async deleteUser(userId) {
        console.log(`🗑️ Удаление пользователя: ${userId}`);
        return new Promise((resolve, reject) => {
            const metadata = this.#getMetadata();
            
            this.adminClient.DeleteUser({ user_id: userId }, metadata, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка DeleteUser:', error);
                    reject(new Error(error.message));
                } else {
                    console.log('✅ DeleteUser успешен');
                    resolve(response);
                }
            });
        });
    }

    async requestEmailCode(email) {
        return new Promise((resolve, reject) => {
            console.log(`📧 Запрос кода на email: ${email}`);
            
            this.client.RequestEmailCode({ email }, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка запроса кода:', error.code, error.message);
                    reject(error);
                } else {
                    console.log('✅ Код отправлен');
                    resolve(response);
                }
            });
        });
    }

    async verifyEmailCode(email, code) {
        return new Promise((resolve, reject) => {
            console.log(`🔐 Проверка кода для: ${email}`);
            
            this.client.VerifyEmailCode({ email, code }, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка проверки кода:', error.code, error.message);
                    reject(error);
                } else {
                    console.log('✅ Вход выполнен');
                    if (response.token) {
                        this.setAuthToken(response.token);
                    }
                    resolve(response);
                }
            });
        });
    }
}

module.exports = new AdminGrpcService();