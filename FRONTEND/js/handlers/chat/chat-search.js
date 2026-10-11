// js/handlers/chat/chat-search.js
import { state } from '../../app.js';
import {
    searchMessages,
    highlightSearchResults,
    nextResult,
    prevResult,
    clearSearch,
} from '../../utils/search/index.js';

let isInitialized = false;

/**
 * Настройка поиска.
 * Вызывается один раз при инициализации чата.
 */
export function setupSearch() {
    if (isInitialized) {
        console.log('setupSearch уже был вызван, пропускаем');
        return;
    }

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const closeSearchBtn = document.getElementById('close-search-results');

    if (!searchInput || !searchBtn) {
        console.warn('Элементы поиска не найдены');
        return;
    }

    // Поиск по кнопке
    searchBtn.addEventListener('click', runSearch);

    // Поиск по Enter
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runSearch();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            clearSearch();
        }
    });

    // Debounce на ввод — ищем через 400 мс после последнего символа
    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            debounceTimer = setTimeout(runSearch, 400);
        } else if (query.length === 0) {
            clearSearch();
        }
    });

    // Закрытие панели результатов
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            clearSearch();
        });
    }

    isInitialized = true;
    console.log('✅ Поиск настроен');
}

/**
 * Запускает поиск по текущему значению поля.
 */
async function runSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    const query = searchInput.value.trim();

    if (!query) {
        clearSearch();
        return;
    }

    if (!state.currentChat) {
        // Нет выбранного чата — показываем подсказку в панели
        const panel = document.getElementById('search-results-panel');
        const list = document.getElementById('search-results-list');
        const chatsList = document.getElementById('chats-list');
        if (panel && list) {
            panel.style.display = 'flex';
            if (chatsList) chatsList.style.display = 'none';
            list.innerHTML = `
                <div class="search-no-results">
                    <div class="no-results-icon">💬</div>
                    <div class="no-results-text">Сначала выберите чат</div>
                    <button class="search-back-button" id="back-from-no-chat">← Назад к списку чатов</button>
                </div>
            `;
            const backBtn = document.getElementById('back-from-no-chat');
            if (backBtn) backBtn.addEventListener('click', clearSearch);
        }
        return;
    }

    await searchMessages(query, state.currentChat);
    highlightSearchResults();
}