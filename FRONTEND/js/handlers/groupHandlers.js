// js/handlers/groupHandlers.js
import { state } from '../app.js';
import { showScreen } from '../ui.js';
import { getContacts, createGroup } from '../storage.js';
import { loadMessagesFromServer } from './chat/chat-messages.js';
import { setCurrentChat } from './chat/chat-core.js';

let selectedContacts = [];

// Показать модальное окно создания группы
function showCreateGroupModal() {
    fetch('pages/create-group.html')
        .then(response => response.text())
        .then(html => {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = html;
            document.body.appendChild(modalContainer.firstChild);
            setupGroupModalHandlers();
        })
        .catch(error => {
            console.error('Ошибка загрузки модального окна создания группы:', error);
            alert('Не удалось загрузить окно создания группы');
        });
}

// Настройка обработчиков модального окна создания группы
function setupGroupModalHandlers() {
    const modal = document.getElementById('create-group-modal');
    const closeBtn = document.getElementById('close-group-modal');
    const cancelBtn = document.getElementById('cancel-group');
    const createBtn = document.getElementById('create-group-submit');
    const groupNameInput = document.getElementById('group-name');
    const contactsList = document.getElementById('contacts-list');
    const contactSearch = document.getElementById('contact-search');
    const selectedTags = document.getElementById('selected-tags');
    const selectedCount = document.getElementById('selected-count');
    
    if (!modal || !createBtn) {
        console.error('Не найдены элементы модального окна');
        return;
    }
    
    selectedContacts = [];
    
    const contacts = getContacts();
    renderContacts(contacts, contactsList);
    
    if (contactSearch) {
        contactSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = contacts.filter(c => 
                c.name.toLowerCase().includes(query) || 
                c.email.toLowerCase().includes(query)
            );
            renderContacts(filtered, contactsList);
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    function validateForm() {
        const nameValid = groupNameInput.value.trim().length >= 3;
        const contactsValid = selectedContacts.length >= 1;
        const isValid = nameValid && contactsValid;
        
        createBtn.disabled = !isValid;
        return isValid;
    }
    
    groupNameInput.addEventListener('input', validateForm);
    
    createBtn.addEventListener('click', () => {
        const groupName = groupNameInput.value.trim();
        
        if (groupName && selectedContacts.length > 0) {
            try {
                const newGroup = createGroup(groupName, selectedContacts);
                
                if (!state.chats) state.chats = [];
                state.chats.push(newGroup);
                
                updateChatsList();
                
                state.currentChat = newGroup.id;
                
                showScreen('chat');
                closeModal();
            } catch (error) {
                console.error('❌ Ошибка создания группы:', error);
                alert('Не удалось создать группу');
            }
        }
    });
    
    function renderContacts(contactsToRender, container) {
        if (!container) return;
        container.innerHTML = '';
        
        contactsToRender.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = `contact-item ${selectedContacts.includes(contact.id) ? 'selected' : ''}`;
            contactItem.innerHTML = `
                <img src="${contact.avatar || 'images/default-avatar.png'}" alt="avatar" class="contact-avatar">
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-email">${contact.email}</div>
                </div>
                <div class="contact-checkbox">${selectedContacts.includes(contact.id) ? '✓' : ''}</div>
            `;
            
            contactItem.addEventListener('click', () => {
                if (selectedContacts.includes(contact.id)) {
                    selectedContacts = selectedContacts.filter(id => id !== contact.id);
                } else {
                    selectedContacts.push(contact.id);
                }
                
                renderContacts(contactsToRender, container);
                updateSelectedTags();
                validateForm();
            });
            
            container.appendChild(contactItem);
        });
    }
    
    function updateSelectedTags() {
        if (selectedTags && selectedCount) {
            selectedCount.textContent = selectedContacts.length;
            selectedTags.innerHTML = '';
            
            selectedContacts.forEach(contactId => {
                const contact = contacts.find(c => c.id === contactId);
                if (contact) {
                    const tag = document.createElement('span');
                    tag.className = 'selected-tag';
                    tag.innerHTML = `
                        ${contact.name}
                        <button class="selected-tag-remove" data-contact-id="${contact.id}">✕</button>
                    `;
                    
                    tag.querySelector('.selected-tag-remove').addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectedContacts = selectedContacts.filter(id => id !== contactId);
                        updateSelectedTags();
                        renderContacts(getContacts(), contactsList);
                        validateForm();
                    });
                    
                    selectedTags.appendChild(tag);
                }
            });
        }
    }
}

// Обновление списка чатов
function updateChatsList() {
    const chatsList = document.getElementById('chats-list');
    if (chatsList) {
        chatsList.innerHTML = '';
        
        if (!state.chats || state.chats.length === 0) {
            chatsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #a0a8b4;">Нет доступных чатов</div>';
            return;
        }
        
        const sortedChats = [...state.chats].sort((a, b) => {
            if (a.settings?.pinned && !b.settings?.pinned) return -1;
            if (!a.settings?.pinned && b.settings?.pinned) return 1;
            return 0;
        });
        
        sortedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${state.currentChat === chat.id ? 'active' : ''}`;
            chatItem.setAttribute('data-chat-id', chat.id);
            
            const pinIcon = chat.settings?.pinned ? '📌 ' : '';
            
            chatItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>${pinIcon}${chat.name}</span>
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
            `;
            
            chatItem.addEventListener('click', () => {
                document.querySelectorAll('.chat-item').forEach(ci => ci.classList.remove('active'));
                chatItem.classList.add('active');
                state.currentChat = chat.id;
                // Используем loadMessagesFromServer вместо loadMessagesForChat
                loadMessagesFromServer(chat.id);
            });
            
            chatItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showChatContextMenu(e, chat);
            });
            
            chatsList.appendChild(chatItem);
        });
    }
}

// Показать информацию о группе
function showGroupInfo(groupId) {
    const group = state.chats.find(c => c.id === groupId);
    if (!group || group.type !== 'group') return;
    
    fetch('pages/group-info.html')
        .then(response => response.text())
        .then(html => {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = html;
            document.body.appendChild(modalContainer.firstChild);
            setupGroupInfoModalHandlers(group);
        })
        .catch(error => {
            console.error('Ошибка загрузки окна информации о группе:', error);
            alert('Не удалось загрузить информацию о группе');
        });
}

// Настройка обработчиков для модального окна информации о группе
function setupGroupInfoModalHandlers(group) {
    const modal = document.getElementById('group-info-modal');
    const closeBtn = document.getElementById('close-group-info');
    const closeBtn2 = document.getElementById('close-group-info-btn');
    const groupNameEl = document.getElementById('modal-group-name');
    const notificationsCheckbox = document.getElementById('group-notifications');
    const pinnedCheckbox = document.getElementById('group-pinned');
    const participantsList = document.getElementById('participants-list');
    const participantsCount = document.getElementById('participants-count');
    
    if (!modal) {
        console.error('Модальное окно не найдено');
        return;
    }
    
    if (groupNameEl) {
        groupNameEl.textContent = group.name;
    }
    
    if (notificationsCheckbox) {
        notificationsCheckbox.checked = group.settings?.notifications !== false;
    }
    
    if (pinnedCheckbox) {
        pinnedCheckbox.checked = group.settings?.pinned || false;
    }
    
    const contacts = getContacts();
    const participants = group.participants.map(userId => {
        const contact = contacts.find(c => c.id === userId) || 
                       { name: 'Неизвестный', email: '', avatar: null };
        return {
            id: userId,
            name: contact.name,
            email: contact.email,
            avatar: contact.avatar,
            isCreator: userId === group.createdBy
        };
    });
    
    if (participantsCount) {
        participantsCount.textContent = participants.length;
    }
    
    if (participantsList) {
        participantsList.innerHTML = '';
        
        participants.forEach(participant => {
            const participantItem = document.createElement('div');
            participantItem.className = 'participant-item';
            participantItem.innerHTML = `
                <img src="${participant.avatar || 'images/default-avatar.png'}" alt="avatar" class="participant-avatar">
                <div class="participant-info">
                    <div class="participant-name">
                        ${participant.name}
                        ${participant.isCreator ? '<span class="creator-badge">👑</span>' : ''}
                    </div>
                    <div class="participant-email">${participant.email}</div>
                </div>
            `;
            participantsList.appendChild(participantItem);
        });
    }
    
    if (notificationsCheckbox) {
        notificationsCheckbox.addEventListener('change', (e) => {
            group.settings = group.settings || {};
            group.settings.notifications = e.target.checked;
            console.log(`Уведомления для группы ${group.name}: ${e.target.checked}`);
        });
    }
    
    if (pinnedCheckbox) {
        pinnedCheckbox.addEventListener('change', (e) => {
            group.settings = group.settings || {};
            group.settings.pinned = e.target.checked;
            updateChatsList();
            console.log(`Закрепление для группы ${group.name}: ${e.target.checked}`);
        });
    }
    
    const closeModal = () => {
        if (modal) modal.remove();
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeBtn2) closeBtn2.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Показать контекстное меню чата
function showChatContextMenu(e, chat) {
    e.preventDefault();
    e.stopPropagation();
    
    const existingMenu = document.querySelector('.chat-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    
    const notificationsItem = document.createElement('div');
    notificationsItem.className = 'context-menu-item';
    notificationsItem.innerHTML = `
        <span>🔔 ${chat.settings?.notifications === false ? 'Включить' : 'Выключить'} уведомления</span>
    `;
    notificationsItem.addEventListener('click', () => {
        chat.settings = chat.settings || {};
        chat.settings.notifications = !chat.settings.notifications;
        console.log(`Уведомления для ${chat.name}: ${chat.settings.notifications}`);
        menu.remove();
    });
    menu.appendChild(notificationsItem);
    
    const pinItem = document.createElement('div');
    pinItem.className = 'context-menu-item';
    pinItem.innerHTML = `
        <span>📌 ${chat.settings?.pinned ? 'Открепить' : 'Закрепить'} чат</span>
    `;
    pinItem.addEventListener('click', () => {
        chat.settings = chat.settings || {};
        chat.settings.pinned = !chat.settings.pinned;
        updateChatsList();
        menu.remove();
    });
    menu.appendChild(pinItem);
    
    if (chat.type === 'group') {
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.background = '#3a424c';
        separator.style.margin = '8px 0';
        menu.appendChild(separator);
        
        const groupInfoItem = document.createElement('div');
        groupInfoItem.className = 'context-menu-item';
        groupInfoItem.innerHTML = `<span>❔ Информация о группе</span>`;
        groupInfoItem.addEventListener('click', () => {
            showGroupInfo(chat.id);
            menu.remove();
        });
        menu.appendChild(groupInfoItem);
        
        const leaveGroupItem = document.createElement('div');
        leaveGroupItem.className = 'context-menu-item';
        leaveGroupItem.innerHTML = `<span>Выйти из группы</span>`;
        leaveGroupItem.style.color = '#e05a5a';
        leaveGroupItem.addEventListener('click', () => {
            if (confirm(`Выйти из группы "${chat.name}"?`)) {
                const index = state.chats.findIndex(c => c.id === chat.id);
                if (index !== -1) {
                    state.chats.splice(index, 1);
                }
                updateChatsList();
                
                if (state.currentChat === chat.id) {
                    state.currentChat = state.chats[0]?.id || null;
                    if (state.currentChat) {
                        loadMessagesFromServer(state.currentChat);
                    } else {
                        const messagesDiv = document.getElementById('messages');
                        if (messagesDiv) messagesDiv.innerHTML = '<div class="no-messages">Выберите чат для общения</div>';
                    }
                }
            }
            menu.remove();
        });
        menu.appendChild(leaveGroupItem);
    } else {
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.background = '#3a424c';
        separator.style.margin = '8px 0';
        menu.appendChild(separator);
        
        const clearHistoryItem = document.createElement('div');
        clearHistoryItem.className = 'context-menu-item';
        clearHistoryItem.innerHTML = `<span>🗑️ Очистить историю</span>`;
        clearHistoryItem.style.color = '#e05a5a';
        clearHistoryItem.addEventListener('click', () => {
            if (confirm(`Очистить историю чата с ${chat.name}?`)) {
                console.log(`Очистка истории чата ${chat.id}`);
                // Очищаем историю
                const messagesDiv = document.getElementById('messages');
                if (messagesDiv) {
                    messagesDiv.innerHTML = '<div class="no-messages">Нет сообщений. Напишите первое сообщение!</div>';
                }
            }
            menu.remove();
        });
        menu.appendChild(clearHistoryItem);
    }
    
    document.body.appendChild(menu);
    
    menu.style.top = e.pageY + 'px';
    menu.style.left = e.pageX + 'px';
    
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function closeModal() {
    const modal = document.getElementById('create-group-modal');
    if (modal) {
        modal.remove();
    }
    const infoModal = document.getElementById('group-info-modal');
    if (infoModal) {
        infoModal.remove();
    }
}

export function logout() {
    console.log('🚪 Выход из системы');
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    state.isAuthenticated = false;
    state.currentUser = null;
    state.token = null;
    state.currentChat = null;
    
    showScreen('login');
}

export { 
    showCreateGroupModal, 
    updateChatsList,
    showChatContextMenu,
    showGroupInfo 
};