// preload.cjs
const { contextBridge } = require('electron');

// Просто включаем Node.js, ничего не скрываем
// (для разработки, в продакшене нужно ограничить)