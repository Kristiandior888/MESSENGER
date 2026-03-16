// js/grpc/grpc-client.js
// В Electron мы можем использовать require

// Динамический импорт для Node.js модулей
let grpc, protoLoader;

// Проверяем, в Electron ли мы
if (typeof require !== 'undefined') {
    // В Electron используем require
    grpc = require('@grpc/grpc-js');
    protoLoader = require('@grpc/proto-loader');
    console.log('✅ gRPC загружен через require в Electron');
} else {
    // В браузере (не должно случиться)
    throw new Error('Это приложение должно запускаться в Electron');
}

const PROTO_PATH = 'proto/messenger.proto';
const SERVER_ADDRESS = '127.0.0.1:5077';

console.log('📁 Загружаем proto из:', PROTO_PATH);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const messenger = protoDescriptor.messenger;

// Создаем клиент
const client = new messenger.Messenger(
    SERVER_ADDRESS,
    grpc.credentials.createInsecure()
);

console.log('✅ gRPC клиент создан');

// Для совместимости с вашим кодом, добавляем Metadata в глобальную область
if (typeof window !== 'undefined') {
    window.grpc = window.grpc || {};
    window.grpc.Metadata = grpc.Metadata;
}

export default client;