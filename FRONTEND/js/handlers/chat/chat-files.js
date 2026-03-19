// js/handlers/chat/chat-files.js
import { saveFileToStorage, getFileFromStorage, downloadFile, getFileIcon, formatFileSize } from '../../utils/fileUtils.js';

// Состояние прикрепленных файлов
export let attachedFiles = [];

/**
 * Обновление индикатора прикрепленных файлов
 */
export function updateAttachedFilesIndicator(files) {
    const btn = document.getElementById('attach-btn');
    if (!btn) return;
    
    if (files.length > 0) {
        btn.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
        btn.style.borderColor = '#d4af37';
        btn.title = `${files.length} файл(ов) прикреплено`;
        
        let counter = btn.querySelector('.file-counter');
        if (!counter) {
            counter = document.createElement('span');
            counter.className = 'file-counter';
            btn.appendChild(counter);
        }
        counter.textContent = files.length;
    } else {
        btn.style.backgroundColor = 'transparent';
        btn.style.borderColor = '#3a424c';
        btn.title = 'Прикрепить файл';
        
        const counter = btn.querySelector('.file-counter');
        if (counter) counter.remove();
    }
}

/**
 * Очистка прикрепленных файлов
 */
export function clearAttachedFiles() {
    attachedFiles = [];
    updateAttachedFilesIndicator(attachedFiles);
}

/**
 * Добавление файлов в список прикрепленных
 */
export async function addAttachedFiles(files) {
    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
            alert(`Файл ${file.name} слишком большой. Максимальный размер - 10MB`);
            continue;
        }

        try {
            const fileId = await saveFileToStorage(file);
            attachedFiles.push({
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type
            });
            console.log(`✅ Файл прикреплен: ${file.name}`);
        } catch (error) {
            console.error('❌ Ошибка при загрузке файла:', error);
            alert(`Не удалось загрузить файл ${file.name}`);
        }
    }
    
    updateAttachedFilesIndicator(attachedFiles);
}

/**
 * Создание элемента файла для сообщения
 */
export function createFileElement(fileData) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'message-file';
    fileDiv.setAttribute('data-file-id', fileData.id);

    const fileIcon = getFileIcon(fileData.name, fileData.type);

    fileDiv.innerHTML = `
        <span class="file-icon ${fileIcon.class}">${fileIcon.icon}</span>
        <div class="file-info">
            <div class="file-name">${fileData.name}</div>
            <div class="file-size">${formatFileSize(fileData.size)}</div>
        </div>
        <span class="download-hint">⬇️</span>
    `;

    fileDiv.addEventListener('click', () => {
        const savedFile = getFileFromStorage(fileData.id);
        if (savedFile) {
            downloadFile(savedFile, fileData.name);
        } else {
            alert('Файл не найден в хранилище');
        }
    });

    return fileDiv;
}

/**
 * Настройка прикрепления файлов
 */
export function setupFileAttachment() {
    const attachBtn = document.getElementById('attach-btn');
    const fileUpload = document.getElementById('file-upload');

    if (attachBtn && fileUpload) {
        attachBtn.addEventListener('click', () => {
            fileUpload.click();
        });

        fileUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            await addAttachedFiles(files);
            fileUpload.value = '';
        });
    }
}