// js/utils/search/search-navigation.js
import { state } from '../../app.js';
import { searchState, resetSearchState } from './search-state.js';
import { renderSearchResults } from './search-render.js';

/**
 * Подсветить сообщения, найденные в поиске, в самом чате.
 */
export function highlightSearchResults() {
    document.querySelectorAll('.message.highlight, .message.current-result')
        .forEach(el => el.classList.remove('highlight', 'current-result'));

    if (searchState.results.length === 0) return;

    searchState.results.forEach((result, idx) => {
        const el = document.querySelector(`.message[data-message-id="${result.message.id}"]`);
        if (!el) return;

        el.classList.add('highlight');
        if (idx === searchState.currentIndex) {
            el.classList.add('current-result');
        }
    });

    scrollToCurrentResult();
}

/**
 * Скроллит к текущему результату.
 */
function scrollToCurrentResult() {
    if (searchState.currentIndex < 0 || searchState.currentIndex >= searchState.results.length) return;

    const result = searchState.results[searchState.currentIndex];
    const el = document.querySelector(`.message[data-message-id="${result.message.id}"]`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Скроллит к сообщению в чате и подсвечивает его.
 * Если сообщения нет в DOM — подгружает историю и повторяет попытку.
 */
export async function scrollToResultInChat(msg) {
    let el = document.querySelector(`.message[data-message-id="${msg.id}"]`);

    if (!el) {
        try {
            const { loadMessagesFromServer } = await import('../../handlers/chat/chat-messages.js');
            await loadMessagesFromServer(state.currentChat);
            el = document.querySelector(`.message[data-message-id="${msg.id}"]`);
        } catch (e) {
            console.warn('Не удалось подгрузить сообщение:', e);
        }
    }

    if (!el) {
        console.warn('Сообщение не найдено в DOM:', msg.id);
        return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight-flash');
    setTimeout(() => el.classList.remove('highlight-flash'), 1500);
}

// ============================================================
//  НАВИГАЦИЯ
// ============================================================

export function nextResult() {
    if (searchState.results.length === 0) return false;
    searchState.currentIndex = (searchState.currentIndex + 1) % searchState.results.length;
    highlightSearchResults();
    renderSearchResults();
    scrollToCurrentResult();
    return true;
}

export function prevResult() {
    if (searchState.results.length === 0) return false;
    searchState.currentIndex = (searchState.currentIndex - 1 + searchState.results.length) % searchState.results.length;
    highlightSearchResults();
    renderSearchResults();
    scrollToCurrentResult();
    return true;
}

// ============================================================
//  СБРОС
// ============================================================

export function clearSearch() {
    resetSearchState();

    document.querySelectorAll('.message.highlight, .message.current-result, .message.highlight-flash')
        .forEach(el => el.classList.remove('highlight', 'current-result', 'highlight-flash'));

    const panel = document.getElementById('search-results-panel');
    const chatsList = document.getElementById('chats-list');

    if (panel) panel.style.display = 'none';
    if (chatsList) chatsList.style.display = 'block';

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
}