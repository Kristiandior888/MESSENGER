// main.cjs
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Глобальный перехват отменённых gRPC-операций,
// чтобы они не валились в консоль как uncaughtException
process.on('uncaughtException', (error) => {
    const msg = String(error?.message || '');
    if (msg.includes('CANCELLED') || msg.includes('Cancelled on client')) {
        console.warn('Игнорируем отменённую gRPC-операцию:', msg);
        return;
    }
    console.error('Критическая ошибка:', error);
});

if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const userDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'user-data');
  app.setPath('userData', userDataPath);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    win.loadFile('index.html');
    win.webContents.openDevTools();
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});