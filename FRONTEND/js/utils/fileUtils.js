// Утилиты для работы с файлами

// Получить иконку для типа файла
function getFileIcon(fileName, fileType) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    // Изображения
    if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
        return { icon: '🖼️', class: 'image' };
    }
    // PDF
    if (fileType === 'application/pdf' || extension === 'pdf') {
        return { icon: '📄', class: 'pdf' };
    }
    // Документы
    if (fileType.includes('document') || ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
        return { icon: '📝', class: 'doc' };
    }
    // Таблицы
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
        return { icon: '📊', class: 'doc' };
    }
    // Презентации
    if (['ppt', 'pptx'].includes(extension)) {
        return { icon: '📽️', class: 'doc' };
    }
    // Архивы
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
        return { icon: '📦', class: 'archive' };
    }
    // Аудио
    if (fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
        return { icon: '🎵', class: 'audio' };
    }
    // Видео
    if (fileType.startsWith('video/') || ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'].includes(extension)) {
        return { icon: '🎬', class: 'video' };
    }
    // Исполняемые файлы
    if (['exe', 'msi', 'bat', 'sh', 'app', 'dmg'].includes(extension)) {
        return { icon: '⚙️', class: 'default' };
    }
    // Код
    if (['js', 'py', 'html', 'css', 'cpp', 'c', 'java', 'php', 'json', 'xml'].includes(extension)) {
        return { icon: '💻', class: 'default' };
    }
    // По умолчанию
    return { icon: '📎', class: 'default' };
}

// Форматировать размер файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Сохранить файл в localStorage (временное решение)
function saveFileToStorage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // Создаем объект файла для хранения
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result, // base64 данные
                lastModified: file.lastModified
            };
            
            // Генерируем уникальный ID
            const fileId = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9]/g, '_');
            
            // Сохраняем в localStorage (для демо)
            try {
                localStorage.setItem('file_' + fileId, JSON.stringify(fileData));
                console.log('Файл сохранен с ID:', fileId);
                resolve(fileId);
            } catch (error) {
                console.error('Ошибка сохранения файла:', error);
                reject(error);
            }
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file); // Читаем как base64
    });
}

// Получить файл из хранилища
function getFileFromStorage(fileId) {
    try {
        const fileData = localStorage.getItem('file_' + fileId);
        return fileData ? JSON.parse(fileData) : null;
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        return null;
    }
}

// Скачать файл
function downloadFile(fileData, fileName) {
    // Создаем ссылку
    const link = document.createElement('a');
    link.href = fileData.data; // base64 данные
    link.download = fileName || fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('Скачивание файла:', fileName || fileData.name);
}

// Удалить файл из хранилища
function removeFileFromStorage(fileId) {
    try {
        localStorage.removeItem('file_' + fileId);
        console.log('Файл удален из хранилища:', fileId);
        return true;
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
        return false;
    }
}

export { 
    getFileIcon, 
    formatFileSize, 
    saveFileToStorage, 
    getFileFromStorage, 
    downloadFile,
    removeFileFromStorage 
};