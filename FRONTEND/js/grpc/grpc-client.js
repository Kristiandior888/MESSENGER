// js/grpc/grpc-client.js
// Отключаем проверку сертификата для разработки
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let grpc, protoLoader;

if (typeof require !== 'undefined') {
    grpc = require('@grpc/grpc-js');
    protoLoader = require('@grpc/proto-loader');
    console.log('✅ gRPC загружен через require в Electron');
} else {
    throw new Error('Это приложение должно запускаться в Electron');
}

const PROTO_PATH = 'proto/messenger.proto';

// Используем HTTPS порт 7212
const SERVER_IP = '192.168.0.21';
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

// Создаем клиент с SSL, отключая проверку сертификата для разработки
const sslCredentials = grpc.credentials.createSsl(
    null,           // корневой сертификат (null для самоподписанного)
    null,           // закрытый ключ клиента
    null,           // сертификат клиента
    { rejectUnauthorized: false }  // ← ОТКЛЮЧАЕМ ПРОВЕРКУ!
);

const client = new messenger.Messenger(
    SERVER_ADDRESS,
    sslCredentials
);

console.log('✅ gRPC клиент создан для адреса:', SERVER_ADDRESS);

if (typeof window !== 'undefined') {
    window.grpc = window.grpc || {};
    window.grpc.Metadata = grpc.Metadata;
}

export default client;