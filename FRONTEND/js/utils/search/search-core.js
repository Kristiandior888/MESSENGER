// js/utils/search/search-core.js
import { state } from '../../app.js';
import { initGrpc } from '../../handlers/chat/chat-core.js';
import { searchState, resetSearchState } from './search-state.js';
import { renderSearchResults } from './search-render.js';
import { highlightSearchResults } from './search-navigation.js';

/**
 * Ищет сообщения по запросу в указанном чате.
 * Подгружает историю страницами по 50, пока не найдёт всё или пока не кончится история.
 */
export async function searchMessages(query, chatId) {
    if (!query || !query.trim()) {
        // Сбросим состояние и панель
        const { clearSearch } = await import('./search-navigation.js');
        clearSearch();
        return [];
    }

    const targetChatId = chatId || state.currentChat;
    if (!targetChatId) {
        console.warn('Поиск невозможен: чат не выбран');
        return [];
    }

    const searchQuery = query.trim().toLowerCase();

    // Тот же запрос в том же чате — переиспользуем
    if (searchState.query === query && searchState.chatId === targetChatId && searchState.results.length > 0) {
        return searchState.results;
    }

    searchState.query = query;
    searchState.chatId = targetChatId;
    searchState.results = [];
    searchState.currentIndex = -1;
    searchState.isSearching = true;
    searchState.totalScanned = 0;
    searchState.reachedEnd = false;

    renderSearchResults(true);

    try {
        const { service } = await initGrpc();

        const PAGE_SIZE = 50;
        const MAX_PAGES = 200;

        let cursor = '';
        let pageCount = 0;
        let previousCursor = null;

        while (!searchState.reachedEnd && pageCount < MAX_PAGES) {
            let response;
            try {
                response = await service.getMessages(targetChatId, PAGE_SIZE, cursor);
            } catch (err) {
                console.error('Ошибка загрузки страницы сообщений:', err);
                searchState.reachedEnd = true;
                break;
            }

            const messages = response?.messages || [];
            const nextCursor = response?.next_cursor || '';

            searchState.totalScanned += messages.length;

            // Сортируем по возрастанию времени
            messages.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));

            for (const msg of messages) {
                const match = matchMessage(msg, searchQuery);
                if (match) {
                    searchState.results.push({
                        message: msg,
                        matchType: match.type,
                        matchedField: match.field,
                    });
                }
            }

            // Обновляем панель по мере поступления
            if (searchState.results.length > 0) {
                searchState.currentIndex = 0;
                renderSearchResults();
            }

            // Условия завершения
            if (messages.length === 0) { searchState.reachedEnd = true; break; }
            if (messages.length < PAGE_SIZE) { searchState.reachedEnd = true; break; }
            if (!nextCursor) { searchState.reachedEnd = true; break; }
            if (nextCursor === cursor || nextCursor === previousCursor) {
                searchState.reachedEnd = true;
                break;
            }

            previousCursor = cursor;
            cursor = nextCursor;
            pageCount++;
        }

        if (pageCount >= MAX_PAGES) {
            console.warn('Поиск остановлен: достигнут лимит страниц');
            searchState.reachedEnd = true;
        }

        // Сортируем итоговые результаты: новые сверху
        searchState.results.sort(
            (a, b) => (Number(b.message.timestamp) || 0) - (Number(a.message.timestamp) || 0)
        );

        if (searchState.results.length > 0) {
            searchState.currentIndex = 0;
        } else {
            searchState.currentIndex = -1;
        }

        renderSearchResults();
        highlightSearchResults();

        return searchState.results;

    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        searchState.reachedEnd = true;
        renderSearchResults();
        return [];
    } finally {
        searchState.isSearching = false;
        renderSearchResults();
    }
}

/**
 * Проверяет, соответствует ли сообщение запросу.
 */
export function matchMessage(msg, query) {
    if (msg.text && msg.text.toLowerCase().includes(query)) {
        return { type: 'text', field: msg.text };
    }
    if (msg.text) {
        const fileMatch = msg.text.match(/📎\s*([^\s]+)/);
        if (fileMatch && fileMatch[1].toLowerCase().includes(query)) {
            return { type: 'file', field: fileMatch[1] };
        }
    }
    if (msg.file_name && msg.file_name.toLowerCase().includes(query)) {
        return { type: 'file', field: msg.file_name };
    }
    return null;
}