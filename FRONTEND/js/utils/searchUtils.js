// js/utils/searchUtils.js
import { state } from '../app.js';
import { initGrpc } from '../handlers/chat/chat-core.js';
import { formatMessageTime, formatDateSeparator, getDateKey } from './dateUtils.js';

// Состояние поиска
let searchState = {
    query: '',
    results: [],          // [{ message, matchType, matchedField }]
    currentIndex: -1,
    isSearching: false,
    totalScanned: 0,
    reachedEnd: false,
    chatId: null,
};

// ============================================================
//  ОСНОВНОЙ ПОИСК
// ============================================================

/**
 * Ищет сообщения по запросу в указанном чате.
 * Подгружает историю по 50 сообщений, пока не найдёт всё или пока не кончится история.
 */
export async function searchMessages(query, chatId) {
    if (!query || !query.trim()) {
        clearSearch();
        return [];
    }

    const targetChatId = chatId || state.currentChat;
    if (!targetChatId) {
        console.warn('Поиск невозможен: чат не выбран');
        return [];
    }

    const searchQuery = query.trim().toLowerCase();

    // Если тот же запрос в том же чате — просто переиспользуем результаты
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

    renderSearchResults(true); // показать "Идёт поиск..."

    try {
        const { service } = await initGrpc();

        const PAGE_SIZE = 50;
        const MAX_PAGES = 200; // защита от бесконечного цикла

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

            // Сортируем по возрастанию времени (старые → новые)
            messages.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));

            // Ищем совпадения
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

            // Обновляем панель по мере поступления результатов
            if (searchState.results.length > 0) {
                searchState.currentIndex = 0;
                renderSearchResults();
            }

            // ============================================================
            //  УСЛОВИЯ ЗАВЕРШЕНИЯ
            // ============================================================

            // 1. Пустая страница — история кончилась
            if (messages.length === 0) {
                searchState.reachedEnd = true;
                break;
            }

            // 2. Пришло меньше, чем размер страницы — это последняя страница
            if (messages.length < PAGE_SIZE) {
                searchState.reachedEnd = true;
                break;
            }

            // 3. Сервер не вернул next_cursor — больше страниц нет
            if (!nextCursor) {
                searchState.reachedEnd = true;
                break;
            }

            // 4. next_cursor не изменился — защита от зацикливания
            if (nextCursor === cursor || nextCursor === previousCursor) {
                searchState.reachedEnd = true;
                break;
            }

            // Переходим к следующей странице
            previousCursor = cursor;
            cursor = nextCursor;
            pageCount++;
        }

        // Если упёрлись в MAX_PAGES — считаем, что дошли до конца
        if (pageCount >= MAX_PAGES) {
            console.warn('Поиск остановлен: достигнут лимит страниц');
            searchState.reachedEnd = true;
        }

        // Сортируем итоговые результаты: сначала новые
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
        // Финальный рендер на случай, если мы вышли из цикла без обновления панели
        renderSearchResults();
    }
}

/**
 * Проверяет, соответствует ли сообщение запросу.
 * Возвращает { type, field } или null.
 */
function matchMessage(msg, query) {
    // 1. По тексту
    if (msg.text && msg.text.toLowerCase().includes(query)) {
        return { type: 'text', field: msg.text };
    }

    // 2. По имени файла (если есть в тексте как "📎 filename.ext")
    if (msg.text) {
        const fileMatch = msg.text.match(/📎\s*([^\s]+)/);
        if (fileMatch && fileMatch[1].toLowerCase().includes(query)) {
            return { type: 'file', field: fileMatch[1] };
        }
    }

    // 3. Если есть отдельное поле file_name (на будущее)
    if (msg.file_name && msg.file_name.toLowerCase().includes(query)) {
        return { type: 'file', field: msg.file_name };
    }

    return null;
}

// ============================================================
//  ПОДСВЕТКА В ЧАТЕ
// ============================================================

/**
 * Подсвечивает сообщения, найденные в поиске.
 * Ищет их в DOM по data-message-id.
 */
export function highlightSearchResults() {
    // Убираем старую подсветку
    document.querySelectorAll('.message.highlight, .message.current-result')
        .forEach(el => el.classList.remove('highlight', 'current-result'));

    if (searchState.results.length === 0) return;

    searchState.results.forEach((result, idx) => {
        const el = document.querySelector(`.message[data-message-id="${result.message.id}"]`);
        if (!el) return; // сообщение ещё не в DOM — ничего не делаем

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

// ============================================================
//  НАВИГАЦИЯ ПО РЕЗУЛЬТАТАМ
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
    searchState.query = '';
    searchState.results = [];
    searchState.currentIndex = -1;
    searchState.isSearching = false;
    searchState.totalScanned = 0;
    searchState.reachedEnd = false;
    searchState.chatId = null;

    document.querySelectorAll('.message.highlight, .message.current-result, .message.highlight-flash')
        .forEach(el => el.classList.remove('highlight', 'current-result', 'highlight-flash'));

    const panel = document.getElementById('search-results-panel');
    const chatsList = document.getElementById('chats-list');

    if (panel) panel.style.display = 'none';
    if (chatsList) chatsList.style.display = 'block';

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
}

// ============================================================
//  РЕНДЕР ПАНЕЛИ РЕЗУЛЬТАТОВ
// ============================================================

/**
 * @param {boolean} showLoading — показать состояние "Идёт поиск..."
 */
export function renderSearchResults(showLoading = false) {
    const panel = document.getElementById('search-results-panel');
    const list = document.getElementById('search-results-list');
    const chatsList = document.getElementById('chats-list');
    const searchInput = document.getElementById('search-input');

    if (!panel || !list) return;

    // Панель поиска активна → скрываем список чатов
    panel.style.display = 'flex';
    if (chatsList) chatsList.style.display = 'none';

    // Пока идёт поиск — показываем индикатор
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

    // Нет запроса — ничего не делаем
    if (!searchState.query) {
        panel.style.display = 'none';
        if (chatsList) chatsList.style.display = 'block';
        return;
    }

    // Нет результатов
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

    // Группируем по дате (ключ — YYYY-MM-DD, чтобы «Сегодня» и «Вчера» не схлопывались)
    const grouped = new Map();
    for (const result of searchState.results) {
        const key = getDateKey(result.message.timestamp) || 'unknown';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(result);
    }

    // Рендерим группы
    for (const [dateKey, items] of grouped) {
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

    // Кнопка "Назад"
    const backButton = document.createElement('div');
    backButton.className = 'search-back-button';
    backButton.textContent = '← Назад к списку чатов';
    backButton.addEventListener('click', clearSearch);
    list.appendChild(backButton);
}

/**
 * Создаёт DOM-элемент одного результата поиска.
 */
function createResultItem(result, index) {
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

    item.addEventListener('click', () => {
        searchState.currentIndex = index;
        highlightSearchResults();
        renderSearchResults();
        scrollToResultInChat(msg);
    });

    return item;
}

/**
 * Возвращает отображаемое имя отправителя сообщения.
 *  - "Вы" — если это текущий пользователь
 *  - имя собеседника в личном чате
 *  - имя участника в групповом чате
 *  - email (без домена) как fallback
 *  - "Пользователь" — если ничего не нашли
 */
function getSenderName(msg) {
    if (!msg) return 'Пользователь';

    // 1. Если это текущий пользователь
    if (msg.sender_id === state.currentUser?.id) {
        return 'Вы';
    }

    // 2. Ищем чат, к которому относится сообщение
    const chat = state.chats?.find(c => c.id === msg.chatid);

    if (chat) {
        const isGroup = (chat.type === 'GROUP' || chat.type === 1);

        // 3. Для группового чата — ищем участника по sender_id
        if (isGroup && Array.isArray(chat.participants)) {
            const participant = chat.participants.find(p => p.id === msg.sender_id);
            if (participant) {
                if (participant.name) return participant.name;
                if (participant.email) return participant.email.split('@')[0];
            }
        }

        // 4. Для личного чата — берём other_user_name
        if (!isGroup) {
            // Если в сообщении есть sender_name от сервера — используем его
            if (msg.sender_name) return msg.sender_name;

            if (chat.other_user_name) return chat.other_user_name;
            if (chat.other_user_email) return chat.other_user_email.split('@')[0];

            // Пробуем найти в participants
            if (Array.isArray(chat.participants)) {
                const other = chat.participants.find(p => p.id !== state.currentUser?.id);
                if (other) {
                    if (other.name) return other.name;
                    if (other.email) return other.email.split('@')[0];
                }
            }
        }
    }

    // 5. Если сервер прислал sender_name прямо в сообщении — используем
    if (msg.sender_name) return msg.sender_name;

    // 6. Fallback
    return 'Пользователь';
}

/**
 * Скроллит к сообщению в чате и подсвечивает его.
 * Если сообщения нет в DOM — пробует подгрузить историю и повторить.
 */
async function scrollToResultInChat(msg) {
    let el = document.querySelector(`.message[data-message-id="${msg.id}"]`);

    if (!el) {
        // Пробуем подгрузить сообщения с сервера
        try {
            const { loadMessagesFromServer } = await import('../handlers/chat/chat-messages.js');
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
//  ВСПОМОГАТЕЛЬНОЕ
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function highlightText(text, query) {
    if (!text || !query) return escapeHtml(text);
    const safeText = escapeHtml(text);
    const safeQuery = escapeRegExp(query);
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return safeText.replace(regex, '<span class="highlight">$1</span>');
}

function escapeRegExp(string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { searchState };