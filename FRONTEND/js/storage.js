// ХРАНИЛИЩЕ СООБЩЕНИЙ ДЛЯ ВСЕХ ЧАТОВ пока просто в оперативке хранятся
let chatMessages = {
    'Лучший коллега': [
        { text: 'привет калека!)))!', type: 'received', time: '14:30' },
        { text: 'ну привет калека)!', type: 'sent', time: '14:31' },
        { text: 'Как дела?', type: 'received', time: '14:32' }
    ],
    'Команда ы': [
        { text: 'Всех приветствую !', type: 'received', time: '10:15' },
        { text: 'Здраствуйте)', type: 'sent', time: '10:16' },
        { text: 'Через 2 недели будет первое стенд-ап выступление нашего коллектива', type: 'received', time: '10:17' },
        { text: 'Скорее бы!!!', type: 'sent', time: '10:17' }
    ],
    'Проект по захвату мира': [
        { text: 'че когда готово будет?', type: 'received', time: '09:45' },
        { text: 'ну к 9 марта что- нибудь накаклякаем..', type: 'sent', time: '09:46' },
        { text: 'Отлично, жду....', type: 'received', time: '09:47' }
    ]
};

// Функции для работы с хранилищем
function saveMessage(chatName, text, type, time) {
    if (!chatMessages[chatName]) {
        chatMessages[chatName] = [];
    }
    chatMessages[chatName].push({ text, type, time });
}

function getMessages(chatName) {
    return chatMessages[chatName] || [];
}

export { chatMessages, saveMessage, getMessages };