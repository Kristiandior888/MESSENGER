const {app, BrowserWindow, Menu}= require('electron') //подключение модулей из электрона

let mainWindow

Menu.setApplicationMenu(null)

const createWindow = () => {

    mainWindow = new BrowserWindow({ //BrowserWindow -модуль создания и управления окнами
        width: 1024,  //  широко
        height: 768,  //  высоко
        frame: true, // уберёт рамку окна (может быть пригодится)
        transparent: false, // прозрачный фон (осторожно, сложно)
        alwaysOnTop: false, // окно всегда поверх других
        webPreferences: {
            //важно  безопасности 
            nodeIntegration: false, //запрещаем выполнять node.js код в окне
            contextIsolation: true // изолируем контексты
        }
    })

    mainWindow.setMenu(null)
    mainWindow.removeMenu()

    //загружаем в окно наш штмл-файл
    mainWindow.loadFile("index.html")

    //для поправления при запущенном процессе
    mainWindow.webContents.openDevTools()


    //очищаем ссылку при закрытии окна
    mainWindow.on('closed',()=>{
        mainWindow = null
    })
}


//метод whenREady сработает когда электрон завершит инициализацию
app.whenReady().then(()=>{  //app - модуль управляющий жизненным циклом приложения
    createWindow()
    //для мака: пересоздать окно, если кликнули на иконку в доке, а окон нет
    app.on ("activate", ()=> {
        if (BrowserWindow.getAllWindows().length===0) 
            createWindow()
    })
})

//закрываем приложение, когда все окна закрыты для винды и линукса
app.on("window-all-closed", ()=> {
    if (process.platform != "darwin")
        app.quit()
})