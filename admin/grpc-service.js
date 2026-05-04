// admin/grpc-service.js
const { client, adminClient } = require('./grpc-client.js');
const grpc = require('@grpc/grpc-js');

let authToken = null;
let pendingEmail = null;

class AdminGrpcService {
    constructor() {
        this.client = client;
        this.adminClient = adminClient;
        console.log('📡 AdminGrpcService инициализирован');
    }

    setAuthToken(token) {
        authToken = token;
        console.log('🔑 Токен авторизации установлен');
    }

    getAuthToken() {
        return authToken;
    }

    setPendingEmail(email) {
        pendingEmail = email;
    }

    getPendingEmail() {
        return pendingEmail;
    }

    clearPendingEmail() {
        pendingEmail = null;
    }

    #getMetadata() {
        const metadata = new grpc.Metadata();
        if (authToken) {
            metadata.add('authorization', `Bearer ${authToken}`);
        }
        return metadata;
    }

    #callAdmin(method, request) {
        return new Promise((resolve, reject) => {
            console.log(`📡 ${method}...`);
            
            const metadata = this.#getMetadata();
            
            if (!this.adminClient[method]) {
                reject(new Error(`Метод ${method} не найден`));
                return;
            }
            
            this.adminClient[method](request, metadata, (error, response) => {
                if (error) {
                    console.error(`❌ Ошибка ${method}:`, error.code, error.message);
                    
                    let errorMessage = error.message;
                    if (error.code === 16) {
                        errorMessage = 'Требуется авторизация. Войдите в систему.';
                    } else if (error.code === 14) {
                        errorMessage = 'Сервер недоступен';
                    }
                    
                    reject(new Error(errorMessage));
                } else {
                    console.log(`✅ ${method} выполнен`);
                    resolve(response);
                }
            });
        });
    }

    async getAllUsers() {
        return this.#callAdmin('GetAllUsers', {});
    }

    async createUser(email, name) {
        return this.#callAdmin('CreateUser', { email, name });
    }

    async editUser(userId, email, name) {
        const request = { user_id: userId };
        if (email !== undefined) request.email = email;
        if (name !== undefined) request.name = name;
        return this.#callAdmin('EditUser', request);
    }

    async deleteUser(userId) {
        return this.#callAdmin('DeleteUser', { user_id: userId });
    }

    async getUserByEmail(email) {
        return this.#callAdmin('GetUserByEmail', { email });
    }

    // Запрос кода на email
    async requestEmailCode(email) {
        return new Promise((resolve, reject) => {
            console.log(`📧 Запрос кода на email: ${email}`);
            
            this.client.RequestEmailCode({ email }, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка запроса кода:', error);
                    reject(error);
                } else {
                    console.log('✅ Код отправлен');
                    resolve(response);
                }
            });
        });
    }

    // Проверка кода и вход
    async verifyEmailCode(email, code) {
        return new Promise((resolve, reject) => {
            console.log(`🔐 Проверка кода для: ${email}`);
            
            this.client.VerifyEmailCode({ email, code }, (error, response) => {
                if (error) {
                    console.error('❌ Ошибка проверки кода:', error);
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

    async checkAuth() {
        try {
            await this.getAllUsers();
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new AdminGrpcService();