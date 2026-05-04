// admin/test-csharp.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

const PROTO_PATH = path.join(__dirname, 'messenger.proto');
const SERVER_ADDRESS = '192.168.0.106:7212';

console.log('🔧 ДИАГНОСТИКА C# БЭКЕНДА\n');

// Проверяем различные варианты подключения
const tests = [
    { name: 'Insecure (без SSL)', creds: grpc.credentials.createInsecure() },
    { name: 'SSL без проверки', creds: grpc.credentials.createSsl(null, null, null, { rejectUnauthorized: false }) },
    { name: 'SSL с пустым корнем', creds: grpc.credentials.createSsl(Buffer.from('')) },
];

async function runTests() {
    for (const test of tests) {
        console.log(`\n📡 Тест ${test.name}...`);
        
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
        });
        
        const proto = grpc.loadPackageDefinition(packageDefinition);
        const client = new proto.messenger.Messenger(SERVER_ADDRESS, test.creds);
        
        await new Promise((resolve) => {
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + 3);
            
            client.waitForReady(deadline, (err) => {
                if (err) {
                    console.log(`   ❌ Не готов: ${err.message}`);
                } else {
                    console.log(`   ✅ Клиент готов!`);
                    
                    // Пробуем вызвать метод
                    client.GetUser({}, (error, response) => {
                        if (error) {
                            console.log(`   ❌ Ошибка вызова: ${error.code} - ${error.message}`);
                        } else {
                            console.log(`   ✅ Метод работает!`);
                        }
                        resolve();
                    });
                }
            });
        });
    }
    
    console.log('\n💡 Если ни один тест не сработал:');
    console.log('1. В C# бэкенде временно переключитесь на ServerCredentials.Insecure');
    console.log('2. Перезапустите бэкенд');
    console.log('3. Запустите этот тест снова');
}

runTests();