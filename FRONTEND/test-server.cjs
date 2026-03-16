// test-server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto/messenger.proto');

console.log('📁 Загружаем proto из:', PROTO_PATH);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition).messenger;

// Создаем тестовый клиент
const client = new proto.Messenger(
    'localhost:5077',
    grpc.credentials.createInsecure()
);

console.log('🔄 Пробуем подключиться к серверу localhost:5077...');

// Пробуем вызвать метод Login
const request = { 
    email: 'test@test.com', 
    password: 'test' 
};

console.log('📤 Отправляем запрос:', request);

client.Login(request, (error, response) => {
    if (error) {
        console.error('\n❌ ОШИБКА ПОДКЛЮЧЕНИЯ:');
        console.error('Код:', error.code);
        console.error('Сообщение:', error.message);
        console.error('Детали:', error.details);
        
        console.log('\n🔍 ЧТО ПРОВЕРИТЬ:');
        console.log('1. Запущен ли бэкенд-сервер?');
        console.log('2. Тот ли порт? (сейчас 5077)');
        console.log('3. Нет ли ошибок в консоли бэкенда?');
        console.log('4. Не блокирует ли фаервол?');
    } else {
        console.log('\n✅ УСПЕХ! Сервер отвечает:');
        console.log(JSON.stringify(response, null, 2));
    }
    
    // Закрываем соединение
    process.exit();
});

// Таймаут на случай если сервер не отвечает
setTimeout(() => {
    console.error('\n⏰ Таймаут: сервер не ответил за 5 секунд');
    process.exit(1);
}, 5000);