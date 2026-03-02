// ХРАНИЛИЩЕ СООБЩЕНИЙ ДЛЯ ВСЕХ ЧАТОВ
let chatMessages = {
    'Лучший коллега': [
        { text: 'привет калека!)))!', type: 'received', time: '14:30', status: 'read' },
        { text: 'ну привет калека)!', type: 'sent', time: '14:31', status: 'read' },
        { text: 'Как дела?', type: 'received', time: '14:32', status: 'read' }
    ],
    'Команда ы': [
        { text: 'Всех приветствую !', type: 'received', time: '10:15', status: 'read' },
        { text: 'Здраствуйте)', type: 'sent', time: '10:16', status: 'read' },
        { text: 'Через 2 недели будет первое стенд-ап выступление нашего коллектива', type: 'received', time: '10:17', status: 'read' },
        { text: 'Скорее бы!!!', type: 'sent', time: '10:17', status: 'read' }
    ],
    'Проект по захвату мира': [
        { text: 'че когда готово будет?', type: 'received', time: '09:45', status: 'read' },
        { text: 'ну к 9 марта что- нибудь накаклякаем..', type: 'sent', time: '09:46', status: 'read' },
        { text: 'Отлично, жду....', type: 'received', time: '09:47', status: 'read' }
    ]
};


// Функции для работы с хранилищем
function saveMessage(chatName, text, type, time, status = 'sending', fileIds = null, files = null) {
    if (!chatMessages[chatName]) {
        chatMessages[chatName] = [];
    }
    
    const message = { text, type, time, status };
    
    // Если есть файлы, добавляем информацию о них
    if (files && files.length > 0) {
        message.files = files.map(f => ({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type
        }));
    }
    
    chatMessages[chatName].push(message);
}

function getMessages(chatName) {
    return chatMessages[chatName] || [];
}

// Функция для обновления статуса последнего сообщения
function updateLastMessageStatus(chatName, newStatus) {
    const messages = chatMessages[chatName];
    if (messages && messages.length > 0) {
        messages[messages.length - 1].status = newStatus;
        console.log(`Статус последнего сообщения обновлен на ${newStatus}`);
        return true;
    }
    return false;
}

export { chatMessages, saveMessage, getMessages, updateLastMessageStatus };