// js/handlers/chat/chat-files.js
import { saveFileToStorage, getFileFromStorage, downloadFile, getFileIcon, formatFileSize } from '../../utils/fileUtils.js';

// Состояние прикрепленных файлов - теперь храним оригинальные File объекты
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
 * Теперь храним оригинальные File объекты
 */
export async function addAttachedFiles(files) {
    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
            alert(`Файл ${file.name} слишком большой. Максимальный размер - 10MB`);
            continue;
        }

        // Сохраняем оригинальный File объект
        attachedFiles.push(file);
        console.log(`✅ Файл прикреплен: ${file.name}, размер: ${file.size}`);
    }
    
    updateAttachedFilesIndicator(attachedFiles);
}

/**
 * Создание элемента файла для сообщения
 * Принимает либо File объект, либо объект с метаданными
 */
export function createFileElement(fileData) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'message-file';
    
    // Получаем имя файла (из File объекта или из метаданных)
    const fileName = fileData.name || (fileData instanceof File ? fileData.name : 'file');
    const fileSize = fileData.size || (fileData instanceof File ? fileData.size : 0);
    const fileType = fileData.type || (fileData instanceof File ? fileData.type : '');
    const fileId = fileData.id || `file_${Date.now()}_${fileName}`;
    
    fileDiv.setAttribute('data-file-id', fileId);

    const fileIcon = getFileIcon(fileName, fileType);

    fileDiv.innerHTML = `
        <span class="file-icon ${fileIcon.class}">${fileIcon.icon}</span>
        <div class="file-info">
            <div class="file-name">${escapeHtml(fileName)}</div>
            <div class="file-size">${formatFileSize(fileSize)}</div>
        </div>
        <span class="download-hint">⬇️</span>
    `;

    fileDiv.addEventListener('click', () => {
        // Если это File объект, скачиваем напрямую
        if (fileData instanceof File) {
            downloadFile(fileData, fileName);
        } else {
            // Иначе пытаемся получить из хранилища
            const savedFile = getFileFromStorage(fileId);
            if (savedFile) {
                downloadFile(savedFile, fileName);
            } else {
                alert('Файл не найден в хранилище');
            }
        }
    });

    return fileDiv;
}

function escapeHtml(str) {
    if (!str) return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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