// js/utils/search/index.js
export { searchState, resetSearchState } from './search-state.js';

export { searchMessages, matchMessage } from './search-core.js';

export {
    renderSearchResults,
    createResultItem,
    getSenderName,
    escapeHtml,
    highlightText,
} from './search-render.js';

export {
    highlightSearchResults,
    scrollToResultInChat,
    nextResult,
    prevResult,
    clearSearch,
} from './search-navigation.js';