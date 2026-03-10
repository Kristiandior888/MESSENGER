// Утилиты для поиска по сообщениям

import { state } from '../app.js';
import { getMessages } from '../storage.js';

// Состояние поиска
let searchState = {
    query: '',
    results: [],
    currentIndex: -1,
    groupedResults: {}, // Результаты, сгруппированные по датам
    originalMessages: []
};

// Функция для форматирования даты
function formatMessageDate(timestamp) {
    // Если есть полная дата, используем её, иначе парсим время
    if (timestamp) {
        // Предполагаем, что время может быть в формате "ЧЧ:ММ"
        // Для демо создадим дату на основе текущего дня
        const today = new Date();
        const [hours, minutes] = timestamp.split(':').map(Number);
        today.setHours(hours, minutes, 0, 0);
        
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return today.toLocaleDateString('ru-RU', options);
    }
    return 'Сегодня';
}

// Функция для группировки сообщений по датам
function groupMessagesByDate(messages) {
    const grouped = {};
    
    messages.forEach((message, index) => {
        const date = formatMessageDate(message.time);
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push({ ...message, originalIndex: index });
    });
    
    return grouped;
}

// Функция поиска по сообщениям
function searchMessages(query) {
    if (!query || query.trim() === '') {
        clearSearch();
        return [];
    }
    
    const messages = getMessages(state.currentChat);
    const searchQuery = query.toLowerCase().trim();
    
    // Ищем во всех сообщениях
    const results = messages.reduce((acc, message, index) => {
        let matched = false;
        
        // Ищем в тексте сообщения
        if (message.text && message.text.toLowerCase().includes(searchQuery)) {
            acc.push({
                index: index,
                message: message,
                matchType: 'text',
                matchedText: message.text
            });
            matched = true;
        }
        
        // Ищем в названиях файлов
        if (!matched && message.files && message.files.length > 0) {
            message.files.forEach(file => {
                if (file.name.toLowerCase().includes(searchQuery)) {
                    acc.push({
                        index: index,
                        message: message,
                        matchType: 'file',
                        fileName: file.name,
                        matchedText: file.name
                    });
                }
            });
        }
        
        return acc;
    }, []);
    
    searchState.query = query;
    searchState.results = results;
    searchState.groupedResults = groupMessagesByDate(results.map(r => r.message));
    searchState.currentIndex = results.length > 0 ? 0 : -1;
    
    return results;
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
            <span class="search-query">"${searchState.query}"</span>
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
            messages.forEach((msg, idx) => {
                const originalIndex = searchState.results.findIndex(r => r.message === msg);
                const result = searchState.results[originalIndex];
                
                const resultItem = document.createElement('div');
                resultItem.className = `search-result-item ${originalIndex === searchState.currentIndex ? 'current-result' : ''}`;
                resultItem.setAttribute('data-message-index', msg.originalIndex);
                
                // Определяем иконку в зависимости от типа
                let icon = '';
                let contentHtml = '';
                
                if (result.matchType === 'file') {
                    icon = '📎';
                    contentHtml = `
                        <div class="search-result-file">
                            <span class="file-icon">📎</span>
                            <span class="file-name">${highlightText(result.fileName, searchState.query)}</span>
                        </div>
                    `;
                } else if (msg.type === 'system') {
                    icon = '📢';
                    contentHtml = `<div class="search-result-text system">${highlightText(msg.text, searchState.query)}</div>`;
                } else {
                    icon = msg.type === 'sent' ? '📤' : '📥';
                    contentHtml = `<div class="search-result-text">${highlightText(msg.text, searchState.query)}</div>`;
                }
                
                // Получаем имя отправителя
                let senderName = '';
                if (msg.type === 'sent') {
                    senderName = 'Вы';
                } else if (msg.type === 'system') {
                    senderName = 'Система';
                } else {
                    // Здесь можно подставить имя из контактов
                    senderName = msg.senderName || 'Собеседник';
                }
                
                resultItem.innerHTML = `
                    <div class="search-result-content">
                        <div class="search-result-icon">${icon}</div>
                        <div class="search-result-info">
                            <div class="search-result-header">
                                <span class="search-result-sender">${senderName}</span>
                                <span class="search-result-time">${msg.time}</span>
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
                    const messageElement = document.querySelectorAll('.message')[msg.originalIndex];
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
        
        // Обработчик для кнопки очистки
        const clearBtn = document.getElementById('clear-search-from-panel');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
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
                <div class="no-results-query">по запросу "${searchState.query}"</div>
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



// Подсветка искомого текста
function highlightText(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
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