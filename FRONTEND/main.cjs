// main.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,        // Включаем Node.js интеграцию
            contextIsolation: false,      // Отключаем изоляцию контекста
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    win.loadFile('index.html');
    
    // Открываем DevTools для отладки
    win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});