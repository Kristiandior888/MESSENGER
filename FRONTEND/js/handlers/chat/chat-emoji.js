// js/handlers/chat/chat-emoji.js
import { renderEmojiPanel } from '../../utils/emojiUtils.js';

let isInitialized = false;

/**
 * Позиционирует панель над кнопкой эмодзи, но с учётом границ окна.
 */
function positionEmojiPanel(emojiBtn, emojiPanel) {
    const btnRect = emojiBtn.getBoundingClientRect();
    const panelWidth = emojiPanel.offsetWidth || 320;
    const panelHeight = emojiPanel.offsetHeight || 360;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Снизу — над кнопкой с отступом
    let bottom = windowHeight - btnRect.top + 8;

    // Справа — выравниваем по правому краю кнопки
    let right = windowWidth - btnRect.right;

    // Если панель не помещается справа — сдвигаем влево
    if (right + panelWidth > windowWidth - 10) {
        right = windowWidth - panelWidth - 10;
    }
    if (right < 10) right = 10;

    // Если панель не помещается сверху — открываем вниз
    if (bottom + panelHeight > windowHeight - 10) {
        bottom = 10;
    }

    emojiPanel.style.bottom = bottom + 'px';
    emojiPanel.style.right = right + 'px';
    emojiPanel.style.top = 'auto';
    emojiPanel.style.left = 'auto';
}

/**
 * Настройка панели эмодзи.
 */
export function setupEmojiPanel() {
    if (isInitialized) {
        console.log('setupEmojiPanel уже был вызван, пропускаем');
        return;
    }

    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
    const emojiContainer = document.getElementById('emoji-container');
    const categoryBtns = document.querySelectorAll('.emoji-category');

    if (!emojiBtn || !emojiPanel || !emojiContainer) {
        console.warn('Элементы панели эмодзи не найдены');
        return;
    }

    // Открытие/закрытие по кнопке
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const isVisible = emojiPanel.style.display === 'flex';

        if (isVisible) {
            emojiPanel.style.display = 'none';
        } else {
            emojiPanel.style.display = 'flex';
            positionEmojiPanel(emojiBtn, emojiPanel);
            const activeCategory = emojiPanel.querySelector('.emoji-category.active');
            const category = activeCategory?.dataset.category || 'recent';
            renderEmojiPanel(emojiContainer, category);
        }
    });

    // Переключение категорий
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category;
            renderEmojiPanel(emojiContainer, category);
        });
    });

    // Клик ЛКМ вне панели — закрыть
    document.addEventListener('click', (e) => {
        if (emojiPanel.style.display !== 'flex') return;
        if (emojiPanel.contains(e.target)) return;
        if (emojiBtn.contains(e.target)) return;
        emojiPanel.style.display = 'none';
    });

    // ПРАВЫЙ КЛИК в любом месте — закрыть панель
    document.addEventListener('contextmenu', () => {
        if (emojiPanel.style.display === 'flex') {
            emojiPanel.style.display = 'none';
        }
    });

    // Escape — закрыть
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && emojiPanel.style.display === 'flex') {
            emojiPanel.style.display = 'none';
        }
    });

    // При скролле в чате — пересчитываем позицию
    const messages = document.getElementById('messages');
    if (messages) {
        messages.addEventListener('scroll', () => {
            if (emojiPanel.style.display === 'flex') {
                positionEmojiPanel(emojiBtn, emojiPanel);
            }
        }, { passive: true });
    }

    // При изменении размера окна — пересчитываем позицию
    window.addEventListener('resize', () => {
        if (emojiPanel.style.display === 'flex') {
            positionEmojiPanel(emojiBtn, emojiPanel);
        }
    });

    isInitialized = true;
    console.log('✅ Панель эмодзи настроена');
}