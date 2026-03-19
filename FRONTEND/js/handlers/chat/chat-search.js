// js/handlers/chat/chat-search.js
import {
    searchMessages,
    highlightSearchResults,
    nextResult,
    prevResult,
    clearSearch
} from '../../utils/searchUtils.js';

/**
 * Настройка поиска
 */
export function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const closeSearchBtn = document.getElementById('close-search-results');
    const nextResultBtn = document.getElementById('next-result');
    const prevResultBtn = document.getElementById('prev-result');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchMessages(query);
                highlightSearchResults();
            } else {
                clearSearch();
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchMessages(query);
                    highlightSearchResults();
                } else {
                    clearSearch();
                }
            }
        });

        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => {
                clearSearch();
                if (searchInput) searchInput.value = '';
            });
        }

        if (nextResultBtn) {
            nextResultBtn.addEventListener('click', nextResult);
        }

        if (prevResultBtn) {
            prevResultBtn.addEventListener('click', prevResult);
        }
    }
}