// js/handlers/groups/create-group.js
import { state } from '../../app.js';
import { showScreen } from '../../ui.js';
import { initGrpc, loadChatsFromServer } from '../chat/chat-core.js';
import { escapeHtml } from '../../utils/domUtils.js';

// Состояние для создания группы
let selectedContacts = [];

/**
 * Показать модальное окно создания группы
 */
export function showCreateGroupModal() {
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
            showError('Не удалось загрузить окно создания группы');
        });
}

/**
 * Настройка обработчиков модального окна
 */
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
    
    // Загружаем контакты
    loadContactsForGroup(contactsList);
    
    // Поиск по контактам
    if (contactSearch) {
        contactSearch.addEventListener('input', (e) => {
            filterContactsForGroup(e.target.value.toLowerCase(), contactsList);
        });
    }
    
    // Закрытие модального окна
    const closeModalWindow = () => modal.remove();
    
    if (closeBtn) closeBtn.addEventListener('click', closeModalWindow);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModalWindow);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalWindow();
    });
    
    // Валидация формы
    function validateForm() {
        const nameValid = groupNameInput.value.trim().length >= 3;
        const contactsValid = selectedContacts.length >= 1;
        createBtn.disabled = !(nameValid && contactsValid);
        return nameValid && contactsValid;
    }
    
    groupNameInput.addEventListener('input', validateForm);
    
    // Создание группы
    createBtn.addEventListener('click', async () => {
        const groupName = groupNameInput.value.trim();
        
        if (!groupName || selectedContacts.length === 0) return;
        
        createBtn.disabled = true;
        createBtn.textContent = 'Создание...';
        
        try {
            const { service } = await initGrpc();
            
            const response = await service.createChat({
                type: 1, // GROUP
                name: groupName,
                participant_ids: selectedContacts
            });
            
            if (response.chat) {
                await loadChatsFromServer();
                state.currentChat = response.chat.id;
                await showScreen('chat');
                closeModalWindow();
            } else {
                throw new Error(response.error || 'Не удалось создать группу');
            }
        } catch (error) {
            console.error('Ошибка создания группы:', error);
            showError('Не удалось создать группу: ' + error.message);
            createBtn.disabled = false;
            createBtn.textContent = 'Создать группу';
        }
    });
    
    // Обновление тегов выбранных контактов
    async function updateSelectedTags() {
        if (!selectedTags || !selectedCount) return;
        
        selectedCount.textContent = selectedContacts.length;
        selectedTags.innerHTML = '';
        
        if (selectedContacts.length === 0) {
            selectedTags.innerHTML = '<span style="color: #a0a8b4; font-size: 0.8rem;">Никто не выбран</span>';
            return;
        }
        
        for (const contactId of selectedContacts) {
            try {
                const { service } = await initGrpc();
                const response = await service.getUser(contactId);
                if (response.user) {
                    const tag = createContactTag(response.user, contactId, updateSelectedTags, validateForm);
                    selectedTags.appendChild(tag);
                }
            } catch (error) {
                console.error('Ошибка загрузки пользователя:', error);
            }
        }
    }
    
    updateSelectedTags();
}

/**
 * Создать тег контакта
 */
function createContactTag(user, contactId, onUpdate, onValidate) {
    const tag = document.createElement('span');
    tag.className = 'selected-tag';
    tag.innerHTML = `
        ${escapeHtml(user.name || user.email.split('@')[0])}
        <button class="selected-tag-remove" data-contact-id="${contactId}">✕</button>
    `;
    
    const removeBtn = tag.querySelector('.selected-tag-remove');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedContacts = selectedContacts.filter(id => id !== contactId);
        onUpdate();
        loadContactsForGroup(document.getElementById('contacts-list'));
        onValidate();
    });
    
    return tag;
}

/**
 * Рендер списка контактов
 */
function renderContacts(contactsToRender, container) {
    if (!container) return;
    container.innerHTML = '';
    
    if (contactsToRender.length === 0) {
        container.innerHTML = '<div class="no-contacts" style="padding: 20px; text-align: center; color: #a0a8b4;">Нет контактов</div>';
        return;
    }
    
    contactsToRender.forEach(contact => {
        const isSelected = selectedContacts.includes(contact.id);
        const contactItem = document.createElement('div');
        contactItem.className = `contact-item ${isSelected ? 'selected' : ''}`;
        contactItem.innerHTML = `
            <div class="contact-avatar">${contact.avatar_url ? `<img src="${contact.avatar_url}" alt="avatar">` : '👤'}</div>
            <div class="contact-info">
                <div class="contact-name">${escapeHtml(contact.name || contact.email)}</div>
                <div class="contact-email">${escapeHtml(contact.email)}</div>
            </div>
            <div class="contact-checkbox">${isSelected ? '✓' : ''}</div>
        `;
        
        contactItem.addEventListener('click', () => {
            if (selectedContacts.includes(contact.id)) {
                selectedContacts = selectedContacts.filter(id => id !== contact.id);
            } else {
                selectedContacts.push(contact.id);
            }
            renderContacts(contactsToRender, container);
            
            // Обновляем теги
            const selectedTags = document.getElementById('selected-tags');
            const selectedCount = document.getElementById('selected-count');
            if (selectedTags && selectedCount) {
                selectedCount.textContent = selectedContacts.length;
                // Перерисовываем теги
                const event = new Event('input');
                document.getElementById('group-name')?.dispatchEvent(event);
            }
        });
        
        container.appendChild(contactItem);
    });
}

/**
 * Загрузка контактов для группы
 */
async function loadContactsForGroup(container) {
    try {
        const { service } = await initGrpc();
        const response = await service.getChats();
        
        const usersMap = new Map();
        response.chats?.forEach(chat => {
            chat.participants?.forEach(user => {
                if (user.id !== state.currentUser?.id) {
                    usersMap.set(user.id, user);
                }
            });
        });
        
        const contactsList = Array.from(usersMap.values());
        renderContacts(contactsList, container);
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        if (container) {
            container.innerHTML = '<div class="error" style="padding: 20px; text-align: center; color: #e05a5a;">Ошибка загрузки контактов</div>';
        }
    }
}

/**
 * Фильтрация контактов
 */
async function filterContactsForGroup(query, container) {
    try {
        const { service } = await initGrpc();
        const response = await service.getChats();
        
        const usersMap = new Map();
        response.chats?.forEach(chat => {
            chat.participants?.forEach(user => {
                if (user.id !== state.currentUser?.id) {
                    if (user.name?.toLowerCase().includes(query) || 
                        user.email?.toLowerCase().includes(query)) {
                        usersMap.set(user.id, user);
                    }
                }
            });
        });
        
        const filtered = Array.from(usersMap.values());
        renderContacts(filtered, container);
    } catch (error) {
        console.error('Ошибка фильтрации контактов:', error);
    }
}

/**
 * Показать ошибку
 */
function showError(message) {
    const { showErrorMessage } = require('../chat/chat-ui.js');
    showErrorMessage(message);
}