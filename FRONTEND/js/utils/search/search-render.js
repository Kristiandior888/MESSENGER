// js/utils/search/search-render.js
import { state } from '../../app.js';
import { formatMessageTime, formatDateSeparator, getDateKey } from '../dateUtils.js';
import { searchState } from './search-state.js';
import { clearSearch, highlightSearchResults, scrollToResultInChat } from './search-navigation.js';

/**
 * Отрисовка панели результатов поиска.
 * @param {boolean} showLoading — показать состояние «Идёт поиск...»
 */
export function renderSearchResults(showLoading = false) {
    const panel = document.getElementById('search-results-panel');
    const list = document.getElementById('search-results-list');
    const chatsList = document.getElementById('chats-list');

    if (!panel || !list) return;

    panel.style.display = 'flex';
    if (chatsList) chatsList.style.display = 'none';

    if (showLoading || searchState.isSearching) {
        list.innerHTML = `
            <div class="search-loading">
                <div class="search-loading-spinner"></div>
                <div class="search-loading-text">Идёт поиск...</div>
                <div class="search-loading-hint">Проверено сообщений: ${searchState.totalScanned}</div>
            </div>
        `;
        return;
    }

    if (!searchState.query) {
        panel.style.display = 'none';
        if (chatsList) chatsList.style.display = 'block';
        return;
    }

    if (searchState.results.length === 0) {
        list.innerHTML = `
            <div class="search-no-results">
                <div class="no-results-icon">🔍</div>
                <div class="no-results-text">Ничего не найдено</div>
                <div class="no-results-query">по запросу "${escapeHtml(searchState.query)}"</div>
                <div class="no-results-hint">Проверено сообщений: ${searchState.totalScanned}</div>
                <button class="search-back-button" id="back-from-no-results">← Назад к списку чатов</button>
            </div>
        `;
        const backBtn = document.getElementById('back-from-no-results');
        if (backBtn) backBtn.addEventListener('click', clearSearch);
        return;
    }

    list.innerHTML = '';

    // Заголовок
    const header = document.createElement('div');
    header.className = 'search-results-header';
    const currentNum = searchState.currentIndex + 1;
    header.innerHTML = `
        <span class="search-results-count">${currentNum} из ${searchState.results.length}</span>
        <span class="search-query">"${escapeHtml(searchState.query)}"</span>
    `;
    list.appendChild(header);

    // Группируем по дате
    const grouped = new Map();
    for (const result of searchState.results) {
        const key = getDateKey(result.message.timestamp) || 'unknown';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(result);
    }

    for (const [, items] of grouped) {
        const dateSep = document.createElement('div');
        dateSep.className = 'search-date-separator';
        dateSep.textContent = formatDateSeparator(items[0].message.timestamp);
        list.appendChild(dateSep);

        for (const result of items) {
            const idx = searchState.results.indexOf(result);
            const item = createResultItem(result, idx);
            list.appendChild(item);
        }
    }

    // Кнопка «Назад»
    const backButton = document.createElement('div');
    backButton.className = 'search-back-button';
    backButton.textContent = '← Назад к списку чатов';
    backButton.addEventListener('click', clearSearch);
    list.appendChild(backButton);
}

/**
 * Создаёт DOM-элемент одного результата поиска.
 */
export function createResultItem(result, index) {
    const msg = result.message;
    const isSent = msg.sender_id === state.currentUser?.id;
    const timeStr = formatMessageTime(msg.timestamp);

    const item = document.createElement('div');
    item.className = `search-result-item${index === searchState.currentIndex ? ' current-result' : ''}`;
    item.dataset.messageId = msg.id;
    item.dataset.index = index;

    const icon = isSent ? '📤' : '📥';
    const senderName = getSenderName(msg);

    let contentHtml = '';
    if (result.matchType === 'file') {
        contentHtml = `
            <div class="search-result-text">
                ${highlightText('📎 ' + result.matchedField, searchState.query)}
            </div>
        `;
    } else {
        contentHtml = `
            <div class="search-result-text">
                ${highlightText(msg.text || '', searchState.query)}
            </div>
        `;
    }

    item.innerHTML = `
        <div class="search-result-content">
            <div class="search-result-icon">${icon}</div>
            <div class="search-result-info">
                <div class="search-result-header">
                    <span class="search-result-sender">${escapeHtml(senderName)}</span>
                    <span class="search-result-time">${timeStr}</span>
                </div>
                ${contentHtml}
            </div>
        </div>
    `;

    item.addEventListener('click', async () => {
        searchState.currentIndex = index;
        highlightSearchResults();
        renderSearchResults();
        await scrollToResultInChat(msg);
    });

    return item;
}

/**
 * Возвращает отображаемое имя отправителя сообщения.
 */
export function getSenderName(msg) {
    if (!msg) return 'Пользователь';

    if (msg.sender_id === state.currentUser?.id) {
        return 'Вы';
    }

    const chat = state.chats?.find(c => c.id === msg.chatid);

    if (chat) {
        const isGroup = (chat.type === 'GROUP' || chat.type === 1);

        if (isGroup && Array.isArray(chat.participants)) {
            const participant = chat.participants.find(p => p.id === msg.sender_id);
            if (participant) {
                if (participant.name) return participant.name;
                if (participant.email) return participant.email.split('@')[0];
            }
        }

        if (!isGroup) {
            if (msg.sender_name) return msg.sender_name;
            if (chat.other_user_name) return chat.other_user_name;
            if (chat.other_user_email) return chat.other_user_email.split('@')[0];

            if (Array.isArray(chat.participants)) {
                const other = chat.participants.find(p => p.id !== state.currentUser?.id);
                if (other) {
                    if (other.name) return other.name;
                    if (other.email) return other.email.split('@')[0];
                }
            }
        }
    }

    if (msg.sender_name) return msg.sender_name;
    return 'Пользователь';
}

// ============================================================
//  ВСПОМОГАТЕЛЬНОЕ
// ============================================================

export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function highlightText(text, query) {
    if (!text || !query) return escapeHtml(text);
    const safeText = escapeHtml(text);
    const safeQuery = escapeRegExp(query);
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return safeText.replace(regex, '<span class="highlight">$1</span>');
}

function escapeRegExp(string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}