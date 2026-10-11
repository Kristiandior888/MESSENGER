// js/utils/search/search-state.js

/**
 * Общее состояние поиска.
 * Экспортируется как объект (не как отдельные переменные),
 * чтобы изменения из одного модуля были видны в другом.
 */
export const searchState = {
    query: '',
    results: [],          // [{ message, matchType, matchedField }]
    currentIndex: -1,
    isSearching: false,
    totalScanned: 0,
    reachedEnd: false,
    chatId: null,
};

/**
 * Сбросить состояние поиска в исходное.
 */
export function resetSearchState() {
    searchState.query = '';
    searchState.results = [];
    searchState.currentIndex = -1;
    searchState.isSearching = false;
    searchState.totalScanned = 0;
    searchState.reachedEnd = false;
    searchState.chatId = null;
}