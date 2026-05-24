const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Текущая директория: FRONTEND
console.log('__dirname:', __dirname);

// Пробуем относительный путь
let PROTO_PATH = path.join(__dirname, 'Protos/messenger.proto');

// Адрес сервера по умолчанию
const DEFAULT_SERVER_ADDRESS = '192.168.0.104:7212';

let currentServerAddress = DEFAULT_SERVER_ADDRESS;
let currentClient = null;

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

// Функция для создания клиента с нужным адресом
function createClient(address) {
    // Создаем клиент с SSL (отключаем проверку для разработки)
    const sslCredentials = grpc.credentials.createSsl(null, null, null, { rejectUnauthorized: false });
    const client = new messenger.Messenger(address, sslCredentials);
    console.log('gRPC клиент создан для адреса:', address);
    return client;
}

// Загружаем сохраненный IP из localStorage (для Electron)
if (typeof localStorage !== 'undefined') {
    const savedIp = localStorage.getItem('serverIp');
    if (savedIp && savedIp.includes(':')) {
        currentServerAddress = savedIp;
    } else if (savedIp) {
        currentServerAddress = `${savedIp}:7212`;
    }
}

// Создаем начального клиента
currentClient = createClient(currentServerAddress);

// Экспортируем клиент с возможностью обновления
const clientProxy = new Proxy(currentClient, {
    get(target, prop) {
        if (prop === 'updateAddress') {
            return (newAddress) => {
                if (!newAddress.includes(':')) {
                    newAddress = `${newAddress}:7212`;
                }
                currentServerAddress = newAddress;
                currentClient = createClient(currentServerAddress);
                // Обновляем прокси
                Object.setPrototypeOf(clientProxy, Object.getPrototypeOf(currentClient));
                Object.assign(clientProxy, currentClient);
                console.log('✅ Адрес сервера обновлен:', currentServerAddress);
                return true;
            };
        }
        if (prop === 'getCurrentAddress') {
            return () => currentServerAddress;
        }
        
        // Проксируем вызовы к текущему клиенту
        const value = target[prop];
        if (typeof value === 'function') {
            return value.bind(target);
        }
        return value;
    }
});

// Экспортируем Metadata для использования в других модулях
if (typeof window !== 'undefined') {
    window.grpc = window.grpc || {};
    window.grpc.Metadata = grpc.Metadata;
}

export default clientProxy;