// js/grpc/grpc-client.js
// Отключаем проверку сертификата для разработки
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');


// Текущая директория: FRONTEND
console.log('__dirname:', __dirname);

// Пробуем относительный путь
let PROTO_PATH = path.join(__dirname, 'Protos/messenger.proto');


// Адрес сервера
const SERVER_ADDRESS = '192.168.0.10:7212';

// Загружаем proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const messenger = protoDescriptor.messenger;

// Создаем клиент с SSL (отключаем проверку для разработки)
const sslCredentials = grpc.credentials.createSsl(null, null, null, { rejectUnauthorized: false });

const client = new messenger.Messenger(SERVER_ADDRESS, sslCredentials);

console.log('gRPC клиент создан для адреса:', SERVER_ADDRESS);

// Экспортируем Metadata для использования в других модулях
if (typeof window !== 'undefined') {
    window.grpc = window.grpc || {};
    window.grpc.Metadata = grpc.Metadata;
}

export default client;