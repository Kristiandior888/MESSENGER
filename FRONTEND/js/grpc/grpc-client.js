// js/grpc/grpc-client.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let grpc, protoLoader;
const path = require('path');
const fs = require('fs');

if (typeof require !== 'undefined') {
    grpc = require('@grpc/grpc-js');
    protoLoader = require('@grpc/proto-loader');
    console.log('✅ gRPC загружен через require в Electron');
} else {
    throw new Error('Это приложение должно запускаться в Electron');
}

// Функция для поиска proto файла
function findProtoPath() {
    const possiblePaths = [
        path.resolve(process.cwd(), '../backend/gov_messenger/Protos/messenger.proto'),
        path.resolve(__dirname, '../../backend/gov_messenger/Protos/messenger.proto'),
        path.resolve(process.cwd(), 'backend/gov_messenger/Protos/messenger.proto'),
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log('📁 Найден proto:', p);
            return p;
        }
    }
    
    console.error('❌ Не найден messenger.proto в путях:', possiblePaths);
    throw new Error('Proto file not found');
}

const PROTO_PATH = findProtoPath();

// IP адрес сервера - меняйте здесь при необходимости
// 'localhost' - если сервер на том же компьютере
// или конкретный IP: '192.168.0.106'
const SERVER_IP = '192.168.0.106'; // ← поменяйте на нужный IP
const SERVER_PORT = 7212;
const SERVER_ADDRESS = `${SERVER_IP}:${SERVER_PORT}`;

console.log('📁 Загружаем proto из:', PROTO_PATH);
console.log('🌐 Подключаемся к серверу:', SERVER_ADDRESS);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const messenger = protoDescriptor.messenger;

const sslCredentials = grpc.credentials.createSsl(null, null, null, { rejectUnauthorized: false });

const client = new messenger.Messenger(SERVER_ADDRESS, sslCredentials);

console.log('✅ gRPC клиент создан');

if (typeof window !== 'undefined') {
    window.grpc = window.grpc || {};
    window.grpc.Metadata = grpc.Metadata;
}

export default client;