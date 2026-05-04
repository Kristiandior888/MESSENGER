// admin/test-connection.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const dns = require('dns');
const net = require('net');

const PROTO_PATH = path.join(__dirname, 'messenger.proto');
const SERVER_ADDRESS = '192.168.0.21:7212';
const HOST = '192.168.0.21';
const PORT = 7212;

console.log('🔧 РАСШИРЕННОЕ ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ\n');

// Тест 1: Проверка TCP соединения
console.log('📡 Тест 1: Проверка TCP соединения...');
const socket = new net.Socket();
socket.setTimeout(3000);

socket.on('connect', () => {
    console.log('   ✅ TCP соединение установлено!');
    socket.destroy();
    
    // Тест 2: gRPC запрос
    testGrpc();
});

socket.on('timeout', () => {
    console.log('   ❌ TCP соединение: Таймаут');
    socket.destroy();
    showHelp();
});

socket.on('error', (err) => {
    console.log(`   ❌ TCP соединение: ${err.message}`);
    showHelp();
});

socket.connect(PORT, HOST);

function testGrpc() {
    console.log('\n📡 Тест 2: gRPC запрос к серверу...');
    
    if (!require('fs').existsSync(PROTO_PATH)) {
        console.error('   ❌ Proto файл не найден:', PROTO_PATH);
        return;
    }
    console.log('   ✅ Proto файл найден');
    
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
    });
    
    const proto = grpc.loadPackageDefinition(packageDefinition);
    const adminClient = new proto.messenger.Admin(SERVER_ADDRESS, grpc.credentials.createInsecure());
    
    // Устанавливаем таймаут
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);
    adminClient.waitForReady(deadline, (err) => {
        if (err) {
            console.log(`   ❌ gRPC клиент не готов: ${err.message}`);
            showHelp();
        } else {
            console.log('   ✅ gRPC клиент готов');
            
            // Отправляем запрос
            adminClient.GetAllUsers({}, (error, response) => {
                if (error) {
                    console.log(`   ❌ Ошибка запроса: ${error.code} - ${error.message}`);
                    showHelp();
                } else {
                    console.log('   ✅ ЗАПРОС УСПЕШЕН!');
                    console.log(`   📊 Получено пользователей: ${response.users?.length || 0}`);
                    if (response.users && response.users.length > 0) {
                        console.log('   👤 Первый пользователь:', response.users[0].name || response.users[0].email);
                    }
                }
            });
        }
    });
}

function showHelp() {
    console.log('\n💡 ВОЗМОЖНЫЕ РЕШЕНИЯ:');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('1️⃣ ПРОВЕРЬТЕ, ЗАПУЩЕН ЛИ БЭКЕНД:');
    console.log('   - Откройте терминал с бэкендом');
    console.log('   - Должны быть видны логи сервера');
    console.log('   - Команда для проверки порта: netstat -an | findstr 7212\n');
    
    console.log('2️⃣ ПРОВЕРЬТЕ IP АДРЕС:');
    console.log(`   - Текущий IP: ${SERVER_ADDRESS}`);
    console.log('   - Узнайте IP сервера: ipconfig (Windows) или ifconfig (Linux)');
    console.log('   - Если сервер на том же ПК, используйте localhost:7212\n');
    
    console.log('3️⃣ ПРОВЕРЬТЕ ПОРТ В БЭКЕНДЕ:');
    console.log('   - В файле main.go или .env должен быть порт 7212');
    console.log('   - Пример: :7212 или 0.0.0.0:7212\n');
    
    console.log('4️⃣ ПРОВЕРЬТЕ БРАНДМАУЭР (FIREWALL):');
    console.log('   - Временно отключите: netsh advfirewall set allprofiles state off');
    console.log('   - Или добавьте правило для порта 7212\n');
    
    console.log('5️⃣ ПОПРОБУЙТЕ localhost:');
    console.log('   - Если бэкенд на том же ПК, измените IP на localhost');
    console.log('   - В файле admin/grpc-client.js замените IP на localhost:7212\n');
    
    console.log('6️⃣ ПРОВЕРЬТЕ НАСТРОЙКИ БЭКЕНДА:');
    console.log('   - Сервер должен слушать все интерфейсы (0.0.0.0:7212)');
    console.log('   - Проверьте main.go на наличие: grpc.NewServer()');
    console.log('   - Убедитесь, что сервер не падает сразу после запуска\n');
    
    console.log('═══════════════════════════════════════════════════════════');
}