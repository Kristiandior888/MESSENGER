// admin/grpc-client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

const PROTO_PATH = path.join(__dirname, 'messenger.proto');
// ВАЖНО: используем https, а не http
const SERVER_ADDRESS = '192.168.0.106:7212';

console.log('🔌 Подключение к C# gRPC серверу (HTTPS/TLS)');

// Отключаем проверку сертификата для разработки (самоподписанные сертификаты)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Загружаем proto
let packageDefinition;
try {
    packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
    console.log('✅ Proto файл загружен');
} catch (err) {
    console.error('❌ Ошибка загрузки proto:', err);
    process.exit(1);
}

const proto = grpc.loadPackageDefinition(packageDefinition);

// Создаем SSL credentials (для HTTPS/gRPC)
// Вариант 1: Отключаем проверку сертификата (для разработки)
const credentials = grpc.credentials.createSsl(
    null,  // rootCert - null значит используем системные
    null,  // privateKey
    null,  // certChain
    { rejectUnauthorized: false }  // Отключаем проверку для самоподписанных сертификатов
);

console.log('✅ SSL credentials созданы (проверка сертификата отключена)');

// Создаем клиенты
const client = new proto.messenger.Messenger(SERVER_ADDRESS, credentials);
const adminClient = new proto.messenger.Admin(SERVER_ADDRESS, credentials);

console.log('🌐 Адрес сервера:', SERVER_ADDRESS);
console.log('🔒 Используется TLS/SSL');

// Ждем готовности с увеличенным таймаутом
const deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 10);

console.log('⏳ Ожидание подключения (до 10 секунд)...');

adminClient.waitForReady(deadline, (err) => {
    if (err) {
        console.error('\n❌ НЕТ ПОДКЛЮЧЕНИЯ!');
        console.error('Ошибка:', err.message);
        console.log('\n💡 ВОЗМОЖНЫЕ РЕШЕНИЯ:');
        console.log('1. Проверьте, что бэкенд использует порт 7212 для HTTPS/gRPC');
        console.log('2. Убедитесь, что сертификаты валидны');
        console.log('3. Попробуйте получить сертификат от бэкенда');
        console.log('4. Проверьте, не блокирует ли антивирус/firewall\n');
    } else {
        console.log('\n✅ ПОДКЛЮЧЕНИЕ УСТАНОВЛЕНО!');
        
        // Тестовый запрос
        console.log('📡 Отправка тестового запроса...');
        adminClient.GetAllUsers({}, (error, response) => {
            if (error) {
                console.error('❌ Ошибка запроса:', error.code, error.message);
                if (error.code === 16) {
                    console.log('\n⚠️ Ошибка аутентификации! Возможно, требуется токен.');
                    console.log('   В админ-панель нужно добавить логин.\n');
                }
            } else {
                console.log('✅ Админ-панель готова к работе!');
                console.log('📊 Пользователей в системе:', response.users?.length || 0);
            }
        });
    }
});

module.exports = { client, adminClient };