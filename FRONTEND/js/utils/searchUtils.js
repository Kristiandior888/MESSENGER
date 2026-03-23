// js/utils/searchUtils.js
import { state } from '../app.js';
import { initGrpc } from '../handlers/chat/chat-core.js';

// Состояние поиска
let searchState = {
    query: '',
    results: [],
    currentIndex: -1,
    groupedResults: {},
    originalMessages: []
};

// Форматирование даты из timestamp
function formatMessageDateFromTimestamp(timestamp) {
    if (!timestamp) return 'Сегодня';
    
    try {
        const timestampNum = Number(timestamp);
        let date;
        
        if (timestampNum < 10000000000) {
            date = new Date(timestampNum * 1000);
        } else {
            date = new Date(timestampNum);
        }
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Сегодня';
        }
        
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Вчера';
        }
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return 'Сегодня';
    }
}

// Форматирование времени сообщения
function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        let date;
        const timestampNum = Number(timestamp);
        
        if (timestampNum < 10000000000) {
            date = new Date(timestampNum * 1000);
        } else {
            date = new Date(timestampNum);
        }
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '';
    }
}

// Группировка сообщений по датам
function groupMessagesByDate(messages) {
    const grouped = {};
    
    messages.forEach((message, index) => {
        const date = formatMessageDateFromTimestamp(message.timestamp);
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push({ ...message, originalIndex: index });
    });
    
    return grouped;
}

// Поиск по сообщениям
async function searchMessages(query) {
    if (!query || query.trim() === '') {
        clearSearch();
        return [];
    }
    
    const searchQuery = query.toLowerCase().trim();
    
    try {
        const { service } = await initGrpc();
        const response = await service.getMessages(state.currentChat, 100);
        const messages = response.messages || [];
        
        const results = messages.reduce((acc, message, index) => {
            // Ищем в тексте сообщения
            if (message.text && message.text.toLowerCase().includes(searchQuery)) {
                acc.push({
                    index: index,
                    message: message,
                    matchType: 'text',
                    matchedText: message.text
                });
            }
            return acc;
        }, []);
        
        searchState.query = query;
        searchState.results = results;
        searchState.groupedResults = groupMessagesByDate(results.map(r => r.message));
        searchState.currentIndex = results.length > 0 ? 0 : -1;
        
        renderSearchResults();
        return results;
    } catch (error) {
        console.error('Ошибка поиска:', error);
        return [];
    }
}

// Подсветка найденных сообщений
function highlightSearchResults() {
    const messages = document.querySelectorAll('.message');
    
    messages.forEach(msg => {
        msg.classList.remove('highlight', 'current-result');
    });
    
    searchState.results.forEach((result, idx) => {
        const messageElement = messages[result.index];
        if (messageElement) {
            messageElement.classList.add('highlight');
            
            if (idx === searchState.currentIndex) {
                messageElement.classList.add('current-result');
                messageElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    });
}

// Переход к следующему результату
function nextResult() {
    if (searchState.results.length === 0) return false;
    
    searchState.currentIndex = (searchState.currentIndex + 1) % searchState.results.length;
    highlightSearchResults();
    renderSearchResults();
    return true;
}

// Переход к предыдущему результату
function prevResult() {
    if (searchState.results.length === 0) return false;
    
    searchState.currentIndex = (searchState.currentIndex - 1 + searchState.results.length) % searchState.results.length;
    highlightSearchResults();
    renderSearchResults();
    return true;
}

// Очистка поиска
function clearSearch() {
    searchState.query = '';
    searchState.results = [];
    searchState.groupedResults = {};
    searchState.currentIndex = -1;
    
    document.querySelectorAll('.message').forEach(msg => {
        msg.classList.remove('highlight', 'current-result');
    });
    
    // Скрываем панель результатов
    const panel = document.getElementById('search-results-panel');
    const chatsList = document.getElementById('chats-list');
    
    if (panel) {
        panel.style.display = 'none';
    }
    if (chatsList) {
        chatsList.style.display = 'block';
    }
}

// Отрисовка результатов поиска в боковой панели
function renderSearchResults() {
    const panel = document.getElementById('search-results-panel');
    const list = document.getElementById('search-results-list');
    const chatsList = document.getElementById('chats-list');
    const searchInput = document.getElementById('search-input');
    
    if (!panel || !list) return;
    
    if (searchState.results.length > 0) {
        // Показываем панель результатов, скрываем список чатов
        panel.style.display = 'flex';
        if (chatsList) {
            chatsList.style.display = 'none';
        }
        
        list.innerHTML = '';
        
        // Заголовок с количеством результатов
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.innerHTML = `
            <span class="search-results-count">Найдено: ${searchState.results.length}</span>
            <span class="search-query">"${escapeHtml(searchState.query)}"</span>
        `;
        list.appendChild(header);
        
        // Группируем результаты по датам
        Object.entries(searchState.groupedResults).forEach(([date, messages]) => {
            // Добавляем разделитель с датой
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'search-date-separator';
            dateSeparator.textContent = date;
            list.appendChild(dateSeparator);
            
            // Добавляем сообщения этой даты
            messages.forEach((msg) => {
                const originalIndex = searchState.results.findIndex(r => r.message.id === msg.id);
                const result = searchState.results[originalIndex];
                const timeStr = formatMessageTime(msg.timestamp);
                const senderId = msg.sender_id;
                const isSent = senderId === state.currentUser?.id;
                
                const resultItem = document.createElement('div');
                resultItem.className = `search-result-item ${originalIndex === searchState.currentIndex ? 'current-result' : ''}`;
                resultItem.setAttribute('data-message-id', msg.id);
                
                let icon = isSent ? '📤' : '📥';
                let contentHtml = `<div class="search-result-text">${highlightText(msg.text || '', searchState.query)}</div>`;
                let senderName = isSent ? 'Вы' : 'Собеседник';
                
                resultItem.innerHTML = `
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
                
                // При клике переходим к сообщению
                resultItem.addEventListener('click', () => {
                    searchState.currentIndex = originalIndex;
                    highlightSearchResults();
                    renderSearchResults();
                    
                    // Прокручиваем к сообщению и подсвечиваем
                    const messageElement = document.querySelector(`.message[data-message-id="${msg.id}"]`);
                    if (messageElement) {
                        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        messageElement.classList.add('highlight-flash');
                        setTimeout(() => {
                            messageElement.classList.remove('highlight-flash');
                        }, 1500);
                    }
                });
                
                list.appendChild(resultItem);
            });
        });
        
        // Добавляем кнопку "Назад к чатам"
        const backButton = document.createElement('div');
        backButton.className = 'search-back-button';
        backButton.innerHTML = '← Назад к списку чатов';
        backButton.addEventListener('click', () => {
            clearSearch();
            panel.style.display = 'none';
            if (chatsList) {
                chatsList.style.display = 'block';
            }
            if (searchInput) {
                searchInput.value = '';
            }
        });
        list.appendChild(backButton);
        
    } else if (searchState.query) {
        // Нет результатов
        panel.style.display = 'flex';
        if (chatsList) {
            chatsList.style.display = 'none';
        }
        
        list.innerHTML = `
            <div class="search-no-results">
                <div class="no-results-icon">🔍</div>
                <div class="no-results-text">Ничего не найдено</div>
                <div class="no-results-query">по запросу "${escapeHtml(searchState.query)}"</div>
                <button class="search-back-button" id="back-from-no-results">← Назад к списку чатов</button>
            </div>
        `;
        
        const backBtn = document.getElementById('back-from-no-results');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                clearSearch();
                panel.style.display = 'none';
                if (chatsList) {
                    chatsList.style.display = 'block';
                }
                if (searchInput) {
                    searchInput.value = '';
                }
            });
        }
    } else {
        panel.style.display = 'none';
        if (chatsList) {
            chatsList.style.display = 'block';
        }
    }
}

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Подсветка искомого текста
function highlightText(text, query) {
    if (!text || !query) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

// Экранирование регулярного выражения
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Обновление UI поиска
function updateSearchUI() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = searchState.query;
    }
    
    renderSearchResults();
}

// Получить статистику поиска
function getSearchStats() {
    return {
        total: searchState.results.length,
        current: searchState.currentIndex + 1,
        query: searchState.query
    };
}

export {
    searchMessages,
    highlightSearchResults,
    nextResult,
    prevResult,
    clearSearch,
    updateSearchUI,
    renderSearchResults,
    getSearchStats,
    searchState
};