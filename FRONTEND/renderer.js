console.log('renderer.js загрузился!');

// СОСТОЯНИЕ ПРИЛОЖЕНИЯ 

let isAuthenticated = false;

// Данные текущего пользователя (пока пусто, заполнится после входа)
let currentUser = null;

// ТЕКУЩИЙ ВЫБРАННЫЙ ЧАТ
let currentChat = 'Лучший коллега';

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


// ФУНКЦИЯ ДОБАВЛЕНИЯ СООБЩЕНИЯ 

function addMessage(text, type, saveToStorage = true) {
    console.log('addMessage вызвана:', text, type, 'сохранять?', saveToStorage);
    
    // Получаем текущее время
    const time = new Date().toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // СОХРАНЯЕМ В ХРАНИЛИЩЕ
    if (saveToStorage && currentChat) {
        console.log('Сохраняем сообщение в хранилище для чата:', currentChat);
        
        if (!chatMessages[currentChat]) {
            chatMessages[currentChat] = [];
        }
        
        chatMessages[currentChat].push({
            text: text,
            type: type,
            time: time
        });
        
        console.log(`Теперь в чате "${currentChat}" ${chatMessages[currentChat].length} сообщений`);
    }
    
    // ПОКАЗЫВАЕМ В ОКНЕ ЧАТА
    const messagesDiv = document.getElementById('messages');
    console.log('messagesDiv:', messagesDiv);
    
    if (messagesDiv) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        messageDiv.innerHTML = `
            <div class="text">${text}</div>
            <div class="time">${time}</div>
        `;
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        console.log('Сообщение добавлено');
    } else {
        console.error('messagesDiv не найден!');
    }
}


// ЗАГРУЗКА HTML-ФАЙЛОВ (для страниц логина и чата)

async function loadPage(url) {
    console.log('Загрузка страницы:', url);
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        console.log('Страница загружена, длина:', html.length);
        return html;
    } catch (error) {
        console.error('Ошибка загрузки страницы:', error);
        return '<div style="color: red; padding: 20px;">Ошибка загрузки</div>';
    }
}


// ПОКАЗ ЭКРАНА (логин или чат)

async function showScreen(screenName) {
    console.log('showScreen вызвана с параметром:', screenName);

    const content = document.getElementById('content');
    console.log('Найден контейнер content:', content);

    let pageUrl = '';
    if (screenName === 'login') {
        pageUrl = 'pages/login.html';
    } else if (screenName === 'chat') {
        pageUrl = 'pages/chat.html';
    }

    if (pageUrl) {
        const html = await loadPage(pageUrl);
        content.innerHTML = html;

        if (screenName === 'chat') {
            setupChatHandlers();
        } else if (screenName === 'login') {
            setupLoginHandlers();
        }
    } else {
        console.error('Неизвестное имя экрана:', screenName);
    }
}


// НАСТРОЙКА ЭКРАНА ВХОДА

function setupLoginHandlers() {
    console.log('setupLoginHandlers вызвана');
    
    const loginBtn = document.getElementById('login-btn');
    console.log('Найдена кнопка логина:', loginBtn);
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Клик по кнопке входа!');
            
            loginBtn.textContent = 'Вход...';
            loginBtn.disabled = true;

            setTimeout(() => {
                console.log('Таймер сработал!');
                
                isAuthenticated = true;
                currentUser = {
                    email: 'kris@company.com',
                    name: 'Кристина Хабло'
                };

                console.log('Пользователь установлен:', currentUser);
                console.log('Пытаемся показать экран чата...');

                showScreen('chat');
            }, 1000);
        });
    } else {
        console.error('Кнопка логина не найдена!');
    }
}


// НАСТРОЙКА ЭКРАНА ЧАТА

function setupChatHandlers() {
    console.log('Чат загружен!');
    
    // ОТОБРАЖАЕМ ИНФОРМАЦИЮ О ПОЛЬЗОВАТЕЛЕ 
    const userEmail = document.getElementById('user-email');
    if (userEmail && currentUser) {
        userEmail.textContent = currentUser.email;
        console.log('Установлен email:', currentUser.email);
    }
    
    // НАСТРАИВАЕМ ОТПРАВКУ СООБЩЕНИЙ 
    const sendBtn = document.getElementById('send-btn');
    const messageField = document.getElementById('message-field');
    
    console.log('Кнопка отправки:', sendBtn);
    console.log('Поле ввода:', messageField);
    
    if (sendBtn && messageField) {
        console.log('Настраиваем обработчики отправки');
        
        const sendMessage = () => {
            console.log('Попытка отправить сообщение');
            
            const text = messageField.value.trim();
            console.log('Текст сообщения:', text);
            
            if (text) {
                addMessage(text, 'sent', true);
                messageField.value = '';
                
                setTimeout(() => {
                    addMessage('Сообщение доставлено!', 'received', true);
                }, 1000);
            } else {
                console.log('Пустое сообщение не отправляем');
            }
        };
        
        sendBtn.addEventListener('click', sendMessage);
        
        messageField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter нажат');
                sendMessage();
            }
        });
        
        console.log('Обработчики отправки настроены');
    } else {
        console.error('Не найдены элементы для отправки сообщений!');
    }
    
    // НАСТРАИВАЕМ КНОПКУ ВЫХОДА 
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('Выход из системы');
            
            isAuthenticated = false;
            currentUser = null;
            
            showScreen('login');
        });
    }
    
    // НАСТРАИВАЕМ ПЕРЕКЛЮЧЕНИЕ ЧАТОВ 
    const chatItems = document.querySelectorAll('.chat-item');
    console.log('Найдено элементов чата:', chatItems.length);
    
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            console.log('Клик по чату:', item.textContent);
            
            chatItems.forEach(ci => ci.classList.remove('active'));
            item.classList.add('active');
            
            const chatName = item.textContent.trim();
            console.log('Выбран чат:', chatName);
            
            // СОХРАНЯЕМ выбранный чат и загружаем его сообщения
            currentChat = chatName;
            loadMessagesForChat(chatName);
        });
    });
    
    // ЗАГРУЖАЕМ СООБЩЕНИЯ ДЛЯ ТЕКУЩЕГО ЧАТА
    loadMessagesForChat(currentChat);
}


// ЗАГРУЗКА СООБЩЕНИЙ ДЛЯ ВЫБРАННОГО ЧАТА

function loadMessagesForChat(chatName) {
    console.log('Загрузка сообщений для чата:', chatName);
    
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = '';
        
        // Загружаем сообщения из хранилища
        const messages = chatMessages[chatName] || [];
        console.log(`Найдено ${messages.length} сохраненных сообщений`);
        
        if (messages.length > 0) {
            // Отображаем все сохраненные сообщения
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.type}`;
                messageDiv.innerHTML = `
                    <div class="text">${msg.text}</div>
                    <div class="time">${msg.time}</div>
                `;
                messagesDiv.appendChild(messageDiv);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        } else {
            // Если сообщений нет, показываем приветствие
            addMessage(`Добро пожаловать в чат "${chatName}"`, 'received', true);
        }
        
        console.log('Сообщения загружены');
    } else {
        console.error('messagesDiv не найден!');
    }
}


// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ

document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена, isAuthenticated =', isAuthenticated);
    
    if (isAuthenticated) {
        showScreen('chat');
    } else {
        showScreen('login');
    }
});