// js/grpc/grpc-client.js
// Отключаем проверку сертификата для разработки
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

console.log('✅ gRPC загружен через require в Electron');

// ПРЯМОЙ АБСОЛЮТНЫЙ ПУТЬ к протофайлу в бэкенде
const PROTO_PATH = 'C:/Users/Кристина/Desktop/messenger/backend/gov_messenger/Protos/messenger.proto';

console.log('📁 Загружаем proto из:', PROTO_PATH);

// Проверяем существование файла
if (!fs.existsSync(PROTO_PATH)) {
    console.error('❌ Протофайл не найден!');
    throw new Error(`Proto file not found: ${PROTO_PATH}`);
}

console.log('✅ Протофайл найден!');

// Адрес сервера
const SERVER_ADDRESS = '192.168.0.11:7212';
console.log('🌐 Подключаемся к серверу:', SERVER_ADDRESS);

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

console.log('✅ gRPC клиент создан для адреса:', SERVER_ADDRESS);

// Экспортируем Metadata для использования в других модулях
if (typeof window !== 'undefined') {
    window.grpc = window.grpc || {};
    window.grpc.Metadata = grpc.Metadata;
}

export default client;