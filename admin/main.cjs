// admin/main.cjs
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: Math.min(1200, width - 100),
        height: Math.min(800, height - 100),
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        title: 'Собор - Админ-панель',
        backgroundColor: '#1a1e24',
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});