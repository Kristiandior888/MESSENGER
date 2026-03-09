// ХРАНИЛИЩЕ СООБЩЕНИЙ ДЛЯ ВСЕХ ЧАТОВ

import { state } from './app.js';



let chatMessages = {
    'chat1': [  // Используем ID вместо названия
        { id: 'msg1', text: 'привет калека!)))!', type: 'received', time: '14:30', status: 'read', sender: 'user2' },
        { id: 'msg2', text: 'ну привет калека)!', type: 'sent', time: '14:31', status: 'read', sender: 'user1' },
        { id: 'msg3', text: 'Как дела?', type: 'received', time: '14:32', status: 'read', sender: 'user2' }
    ],
    'chat2': [
        { id: 'msg4', text: 'Всех приветствую !', type: 'received', time: '10:15', status: 'read', sender: 'user3' },
        { id: 'msg5', text: 'Здраствуйте)', type: 'sent', time: '10:16', status: 'read', sender: 'user1' },
        { id: 'msg6', text: 'Через 2 недели будет первое стенд-ап выступление нашего коллектива', type: 'received', time: '10:17', status: 'read', sender: 'user4' }
    ],
    'chat3': [
        { id: 'msg7', text: 'че когда готово будет?', type: 'received', time: '09:45', status: 'read', sender: 'user5' },
        { id: 'msg8', text: 'ну к 9 марта что- нибудь накаклякаем..', type: 'sent', time: '09:46', status: 'read', sender: 'user1' }
    ]
};

// СПИСОК КОНТАКТОВ (пользователей)
let contacts = [
    { id: 'user1', name: 'Кристина', email: 'kris@company.com', avatar: null, online: true },
    { id: 'user2', name: 'Анна', email: 'anna@company.com', avatar: null, online: false },
    { id: 'user3', name: 'Иван', email: 'ivan@company.com', avatar: null, online: true },
    { id: 'user4', name: 'Петр', email: 'petr@company.com', avatar: null, online: true },
    { id: 'user5', name: 'Мария', email: 'maria@company.com', avatar: null, online: false },
    { id: 'user6', name: 'Алексей', email: 'alex@company.com', avatar: null, online: true }
];

// Функции для работы с хранилищем
function saveMessage(chatName, text, type, time, status = 'sending', fileIds = null, files = null) {
    if (!chatMessages[chatName]) {
        chatMessages[chatName] = [];
    }
    
    const message = { 
        id: 'msg_' + Date.now() + '_' + Math.random(),
        text, 
        type, 
        time, 
        status,
        sender: type === 'sent' ? 'user1' : 'user2' // Временно, потом заменится на реального отправителя
    };
    
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
    return message;
}

// Функция для получения сообщений чата
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

// Функции для работы с группами
function createGroup(name, participants) {
    const groupId = 'group_' + Date.now();
    const newGroup = {
        id: groupId,
        name: name,
        type: 'group',
        participants: [state.currentUser?.id, ...participants],
        createdBy: state.currentUser?.id,
        createdAt: new Date().toISOString(),
        lastMessage: 'Группа создана',
        unreadCount: 0,
        settings: {
            notifications: true,
            pinned: false
        }
    };
    
    chatMessages[groupId] = [];
    
    chatMessages[groupId].push({
        id: 'sys_' + Date.now(),
        text: `Группа создана пользователем ${state.currentUser?.name}`,
        type: 'system',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        sender: 'system'
    });
    
    return newGroup; // Возвращаем всю группу, а не только ID
}

function deleteGroup(groupId) {
    delete chatMessages[groupId];
    return true;
}

function leaveGroup(groupId) {
    // Просто возвращаем успех, логика будет в groupHandlers.js
    return true;
}

function getGroupInfo(groupId) {
    return state.chats.find(c => c.id === groupId);
}

function getContacts() {
    return contacts.filter(c => c.id !== state.currentUser?.id);
}

// Экспортируем ВСЕ функции и переменные
export { 
    chatMessages, 
    contacts,
    saveMessage, 
    getMessages, 
    updateLastMessageStatus,
    createGroup,
    deleteGroup,
    leaveGroup,
    getGroupInfo,
    getContacts
};