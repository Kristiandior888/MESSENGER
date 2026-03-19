// js/handlers/chat/chat-emoji.js
import { renderEmojiPanel } from '../../utils/emojiUtils.js';

/**
 * Позиционирование панели эмодзи
 */
function positionEmojiPanel(emojiBtn, emojiPanel) {
    const btnRect = emojiBtn.getBoundingClientRect();
    const panelWidth = 350;
    const windowWidth = window.innerWidth;

    let left = btnRect.left;

    if (left + panelWidth > windowWidth) {
        left = windowWidth - panelWidth - 10;
    }

    if (left < 10) {
        left = 10;
    }

    emojiPanel.style.position = 'fixed';
    emojiPanel.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px';
    emojiPanel.style.left = left + 'px';
    emojiPanel.style.display = 'flex';
}

/**
 * Настройка панели эмодзи
 */
export function setupEmojiPanel() {
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
    const emojiContainer = document.getElementById('emoji-container');
    const categoryBtns = document.querySelectorAll('.emoji-category');

    if (emojiBtn && emojiPanel && emojiContainer) {
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = emojiPanel.style.display === 'flex';

            if (!isVisible) {
                positionEmojiPanel(emojiBtn, emojiPanel);
                renderEmojiPanel(emojiContainer, 'recent');
            } else {
                emojiPanel.style.display = 'none';
            }
        });

        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const category = btn.getAttribute('data-category');
                renderEmojiPanel(emojiContainer, category);
            });
        });

        document.addEventListener('click', (e) => {
            if (!emojiPanel.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
                emojiPanel.style.display = 'none';
            }
        });

        window.addEventListener('scroll', () => {
            if (emojiPanel.style.display === 'flex') {
                emojiPanel.style.display = 'none';
            }
        }, true);
    }
}