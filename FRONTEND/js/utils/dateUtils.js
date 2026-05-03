// js/utils/dateUtils.js

/**
 * Форматирование времени сообщения из timestamp
 */
export function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const timestampNum = Number(timestamp);
        let date;
        
        // Если timestamp в секундах (меньше 10^10), конвертируем в миллисекунды
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
        console.error('❌ Ошибка форматирования времени:', error);
        return '';
    }
}

/**
 * Форматирование даты сообщения
 */
export function formatMessageDate(timestamp) {
    if (!timestamp) return '';
    
    try {
        const timestampNum = Number(timestamp);
        let date;
        
        if (timestampNum < 10000000000) {
            date = new Date(timestampNum * 1000);
        } else {
            date = new Date(timestampNum);
        }
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Сравниваем по дате (без времени)
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
        console.error('❌ Ошибка форматирования даты:', error);
        return '';
    }
}

/**
 * Получить относительное время (например, "5 минут назад")
 */
export function getRelativeTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const timestampNum = Number(timestamp);
        let date;
        
        if (timestampNum < 10000000000) {
            date = new Date(timestampNum * 1000);
        } else {
            date = new Date(timestampNum);
        }
        
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
            return 'только что';
        } else if (diffMin < 60) {
            return `${diffMin} ${declension(diffMin, ['минуту', 'минуты', 'минут'])} назад`;
        } else if (diffHour < 24) {
            return `${diffHour} ${declension(diffHour, ['час', 'часа', 'часов'])} назад`;
        } else if (diffDay < 7) {
            return `${diffDay} ${declension(diffDay, ['день', 'дня', 'дней'])} назад`;
        } else {
            return formatMessageDate(timestamp);
        }
    } catch (error) {
        return '';
    }
}

/**
 * Склонение существительных после числительных
 */
function declension(number, words) {
    const cases = [2, 0, 1, 1, 1, 2];
    const index = (number % 100 > 4 && number % 100 < 20) ? 2 : cases[Math.min(number % 10, 5)];
    return words[index];
}