// admin/grpc-client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

// Путь к proto файлу
const PROTO_PATH = path.join(__dirname, 'messenger.proto');

if (!fs.existsSync(PROTO_PATH)) {
    console.error('❌ Файл messenger.proto не найден в:', PROTO_PATH);
    console.error('   Пожалуйста, скопируйте файл messenger.proto в папку admin');
    process.exit(1);
}

// Адрес сервера по умолчанию (будет изменен через админ-панель)
const DEFAULT_SERVER_ADDRESS = 'localhost:7212';

console.log('✅ Proto файл найден:', PROTO_PATH);

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

// Создаем клиенты с insecure соединением (для разработки)
const credentials = grpc.credentials.createInsecure();

const client = new messenger.Messenger(DEFAULT_SERVER_ADDRESS, credentials);
const adminClient = new messenger.Admin(DEFAULT_SERVER_ADDRESS, credentials);

console.log('🔌 gRPC клиенты созданы (адрес по умолчанию:', DEFAULT_SERVER_ADDRESS + ')');
console.log('💡 Адрес сервера можно изменить в интерфейсе админ-панели');

// Экспортируем клиенты
module.exports = { client, adminClient };