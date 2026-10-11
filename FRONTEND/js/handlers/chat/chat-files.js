// js/handlers/chat/chat-files.js
import { getFileIcon, formatFileSize, getFileFromStorage, downloadFile } from '../../utils/fileUtils.js';
import { escapeHtml } from '../../utils/domUtils.js';

// Состояние прикреплённых файлов.
// Каждый элемент: { id, name, size, type, file }
// Поле `file` — оригинальный браузерный File-объект, нужен для загрузки на сервер.
export let attachedFiles = [];

/**
 * Обновление индикатора прикреплённых файлов
 */
export function updateAttachedFilesIndicator(files) {
    const btn = document.getElementById('attach-btn');
    if (!btn) return;

    if (files.length > 0) {
        btn.classList.add('has-files');
        btn.title = `${files.length} файл(ов) прикреплено`;

        let counter = btn.querySelector('.file-counter');
        if (!counter) {
            counter = document.createElement('span');
            counter.className = 'file-counter';
            btn.appendChild(counter);
        }
        counter.textContent = files.length;
    } else {
        btn.classList.remove('has-files');
        btn.title = 'Прикрепить файл';

        const counter = btn.querySelector('.file-counter');
        if (counter) counter.remove();
    }
}

/**
 * Очистка прикреплённых файлов
 */
export function clearAttachedFiles() {
    attachedFiles = [];
    updateAttachedFilesIndicator(attachedFiles);
}

/**
 * Добавление файлов в список прикреплённых.
 */
export async function addAttachedFiles(files) {
    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
            alert(`Файл ${file.name} слишком большой. Максимальный размер — 10 MB`);
            continue;
        }

        const localId = `local_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

        attachedFiles.push({
            id: localId,
            name: file.name,
            size: file.size,
            type: file.type,
            file,
        });

        console.log(`✅ Файл прикреплён (локально): ${file.name}`);
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
            <div class="file-name">${escapeHtml(fileData.name)}</div>
            <div class="file-size">${formatFileSize(fileData.size)}</div>
        </div>
        <span class="download-hint">⬇️</span>
    `;

    fileDiv.addEventListener('click', () => {
        const savedFile = getFileFromStorage(fileData.id);
        if (savedFile) {
            downloadFile(savedFile, fileData.name);
        } else {
            alert('Файл не найден в локальном хранилище');
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