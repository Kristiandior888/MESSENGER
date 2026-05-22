// js/handlers/groups/create-group.js
import { state } from '../../app.js';
import { initGrpc, loadChatsFromServer } from '../chat/chat-core.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { showErrorMessage } from '../chat/chat-ui.js';

// Состояние для создания группы
let selectedContacts = [];
let allContacts = [];

/**
 * Показать модальное окно создания группы
 */
export function showCreateGroupModal() {
    console.log('🔨 showCreateGroupModal вызвана');
    
    // Удаляем существующее модальное окно если есть
    const existingModal = document.getElementById('create-group-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Создаем модальное окно напрямую через DOM API
    const modal = createModalElement();
    document.body.appendChild(modal);
    
    console.log('✅ Модальное окно добавлено в DOM');
    
    // Настраиваем обработчики
    setupGroupModalHandlers(modal);
}

/**
 * Создание модального окна через DOM API
 */
function createModalElement() {
    // Оверлей
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'create-group-modal';
    
    // Контейнер
    const container = document.createElement('div');
    container.className = 'modal-container';
    
    // Хедер
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Создать новую группу';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.id = 'close-group-modal';
    closeBtn.textContent = '✕';
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    // Форма - название группы
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    
    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'group-name');
    nameLabel.textContent = 'Название группы';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'group-name';
    nameInput.className = 'form-input';
    nameInput.placeholder = 'Например: Отдел разработки';
    nameInput.autocomplete = 'off';
    
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    
    // Форма - выбор участников
    const participantsGroup = document.createElement('div');
    participantsGroup.className = 'form-group';
    
    const participantsLabel = document.createElement('label');
    participantsLabel.textContent = 'Выберите участников (минимум 1)';
    
    // Поиск
    const searchDiv = document.createElement('div');
    searchDiv.className = 'search-contacts';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'contact-search';
    searchInput.className = 'form-input';
    searchInput.placeholder = 'Поиск по имени или email...';
    
    searchDiv.appendChild(searchInput);
    
    // Список контактов
    const contactsList = document.createElement('div');
    contactsList.id = 'contacts-list';
    contactsList.className = 'contacts-list';
    contactsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #a0a8b4;">Загрузка контактов...</div>';
    
    // Выбранные контакты
    const selectedDiv = document.createElement('div');
    selectedDiv.className = 'selected-contacts';
    selectedDiv.id = 'selected-contacts';
    
    const selectedTitle = document.createElement('div');
    selectedTitle.className = 'selected-title';
    selectedTitle.innerHTML = 'Выбрано: <span id="selected-count">0</span>';
    
    const selectedTags = document.createElement('div');
    selectedTags.id = 'selected-tags';
    selectedTags.className = 'selected-tags';
    selectedTags.innerHTML = '<span style="color: #a0a8b4; font-size: 0.8rem;">Никто не выбран</span>';
    
    selectedDiv.appendChild(selectedTitle);
    selectedDiv.appendChild(selectedTags);
    
    participantsGroup.appendChild(participantsLabel);
    participantsGroup.appendChild(searchDiv);
    participantsGroup.appendChild(contactsList);
    participantsGroup.appendChild(selectedDiv);
    
    body.appendChild(nameGroup);
    body.appendChild(participantsGroup);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.id = 'cancel-group';
    cancelBtn.textContent = 'Отмена';
    
    const createBtn = document.createElement('button');
    createBtn.className = 'btn-primary';
    createBtn.id = 'create-group-submit';
    createBtn.textContent = 'Создать группу';
    createBtn.disabled = true;
    
    footer.appendChild(cancelBtn);
    footer.appendChild(createBtn);
    
    // Собираем всё вместе
    container.appendChild(header);
    container.appendChild(body);
    container.appendChild(footer);
    overlay.appendChild(container);
    
    return overlay;
}

/**
 * Настройка обработчиков модального окна
 */
function setupGroupModalHandlers(modal) {
    console.log('🔧 setupGroupModalHandlers вызвана');
    
    if (!modal) {
        console.error('❌ Модальное окно не передано');
        return;
    }
    
    const closeBtn = document.getElementById('close-group-modal');
    const cancelBtn = document.getElementById('cancel-group');
    const createBtn = document.getElementById('create-group-submit');
    const groupNameInput = document.getElementById('group-name');
    const contactsList = document.getElementById('contacts-list');
    const contactSearch = document.getElementById('contact-search');
    const selectedTags = document.getElementById('selected-tags');
    const selectedCount = document.getElementById('selected-count');
    
    if (!createBtn) {
        console.error('❌ Кнопка создания не найдена');
        return;
    }
    
    if (!contactsList) {
        console.error('❌ Список контактов не найден');
        return;
    }
    
    selectedContacts = [];
    allContacts = [];
    
    // Загружаем контакты
    loadContactsForGroup(contactsList);
    
    // Поиск по контактам
    if (contactSearch) {
        contactSearch.addEventListener('input', (e) => {
            filterContactsForGroup(e.target.value.toLowerCase(), contactsList);
        });
    }
    
    // Закрытие модального окна
    const closeModalWindow = () => {
        console.log('🔚 Закрытие модального окна');
        if (modal && modal.parentNode) modal.remove();
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModalWindow);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModalWindow);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalWindow();
    });
    
    // Валидация формы
    function validateForm() {
        const nameValid = groupNameInput && groupNameInput.value.trim().length >= 3;
        const contactsValid = selectedContacts.length >= 1;
        const disabled = !(nameValid && contactsValid);
        if (createBtn) createBtn.disabled = disabled;
        return !disabled;
    }
    
    if (groupNameInput) {
        groupNameInput.addEventListener('input', validateForm);
    }
    
    // Создание группы
    createBtn.addEventListener('click', async () => {
        const groupName = groupNameInput ? groupNameInput.value.trim() : '';
        
        if (!groupName || selectedContacts.length === 0) return;
        
        createBtn.disabled = true;
        createBtn.textContent = 'Создание...';
        
        try {
            const { service } = await initGrpc();
            
            console.log('📤 Создание группы:', {
                name: groupName,
                participants: selectedContacts
            });
            
            const response = await service.createChat(1, groupName, selectedContacts);
            
            console.log('📨 Ответ сервера:', response);
            
            if (response && response.chat) {
                // Обновляем список чатов
                await loadChatsFromServer();
                
                // Переключаемся на созданную группу
                if (response.chat.id) {
                    state.currentChat = response.chat.id;
                }
                
                // Закрываем модальное окно
                closeModalWindow();
                
                // Обновляем UI чата
                const { updateChatAreaUI } = await import('../chat/chat-ui.js');
                await updateChatAreaUI();
                
                console.log('✅ Группа успешно создана:', response.chat);
            } else {
                throw new Error(response?.error || 'Не удалось создать группу');
            }
        } catch (error) {
            console.error('❌ Ошибка создания группы:', error);
            showErrorMessage('Не удалось создать группу: ' + error.message);
            createBtn.disabled = false;
            createBtn.textContent = 'Создать группу';
        }
    });
    
    // Обновление тегов выбранных контактов
    async function updateSelectedTagsUI() {
        if (!selectedTags || !selectedCount) return;
        
        selectedCount.textContent = selectedContacts.length;
        selectedTags.innerHTML = '';
        
        if (selectedContacts.length === 0) {
            selectedTags.innerHTML = '<span style="color: #a0a8b4; font-size: 0.8rem;">Никто не выбран</span>';
            return;
        }
        
        for (const contactId of selectedContacts) {
            const contact = allContacts.find(c => c.id === contactId);
            if (contact) {
                const tag = createContactTag(contact, contactId, updateSelectedTagsUI, validateForm);
                selectedTags.appendChild(tag);
            }
        }
    }
    
    updateSelectedTagsUI();
    console.log('✅ setupGroupModalHandlers завершена');
}

/**
 * Создать тег контакта
 */
function createContactTag(user, contactId, onUpdate, onValidate) {
    const tag = document.createElement('span');
    tag.className = 'selected-tag';
    const displayName = user.name || user.email?.split('@')[0] || 'Пользователь';
    tag.innerHTML = `
        ${escapeHtml(displayName)}
        <button class="selected-tag-remove" data-contact-id="${contactId}" title="Удалить">✕</button>
    `;
    
    const removeBtn = tag.querySelector('.selected-tag-remove');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedContacts = selectedContacts.filter(id => id !== contactId);
        onUpdate();
        // Перезагружаем список контактов для обновления выделения
        const contactsList = document.getElementById('contacts-list');
        if (contactsList && allContacts.length > 0) {
            renderContacts(allContacts, contactsList, selectedContacts);
        }
        if (onValidate) onValidate();
    });
    
    return tag;
}

/**
 * Рендер списка контактов
 */
function renderContacts(contactsToRender, container, selectedIds) {
    if (!container) return;
    container.innerHTML = '';
    
    if (!contactsToRender || contactsToRender.length === 0) {
        container.innerHTML = '<div class="no-contacts" style="padding: 20px; text-align: center; color: #a0a8b4;">Нет контактов для добавления</div>';
        return;
    }
    
    contactsToRender.forEach(contact => {
        const isSelected = selectedIds.includes(contact.id);
        const contactItem = document.createElement('div');
        contactItem.className = `contact-item ${isSelected ? 'selected' : ''}`;
        contactItem.setAttribute('data-contact-id', contact.id);
        
        const displayName = contact.name || contact.email?.split('@')[0] || 'Пользователь';
        
        contactItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                <div class="contact-avatar" style="width: 36px; height: 36px; border-radius: 50%; background: #d4af37; display: flex; align-items: center; justify-content: center;">
                    ${contact.avatar_url ? `<img src="${contact.avatar_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : '👤'}
                </div>
                <div class="contact-info" style="flex: 1;">
                    <div class="contact-name" style="font-weight: 500; color: var(--text-primary, #e0e0e0);">${escapeHtml(displayName)}</div>
                    <div class="contact-email" style="font-size: 0.75rem; color: var(--text-muted, #a0a8b4);">${escapeHtml(contact.email)}</div>
                </div>
                <div class="contact-checkbox" style="color: #d4af37; font-size: 18px;">${isSelected ? '✓' : ''}</div>
            </div>
        `;
        
        contactItem.addEventListener('click', () => {
            if (selectedContacts.includes(contact.id)) {
                selectedContacts = selectedContacts.filter(id => id !== contact.id);
            } else {
                selectedContacts.push(contact.id);
            }
            
            // Обновляем отображение
            renderContacts(contactsToRender, container, selectedContacts);
            
            // Обновляем теги
            updateSelectedTagsUISimple();
            
            // Валидируем форму
            const groupNameInput = document.getElementById('group-name');
            const createBtn = document.getElementById('create-group-submit');
            if (groupNameInput && createBtn) {
                const nameValid = groupNameInput.value.trim().length >= 3;
                createBtn.disabled = !(nameValid && selectedContacts.length >= 1);
            }
        });
        
        container.appendChild(contactItem);
    });
}

// Простая версия обновления тегов
async function updateSelectedTagsUISimple() {
    const selectedTags = document.getElementById('selected-tags');
    const selectedCount = document.getElementById('selected-count');
    
    if (!selectedTags || !selectedCount) return;
    
    selectedCount.textContent = selectedContacts.length;
    selectedTags.innerHTML = '';
    
    if (selectedContacts.length === 0) {
        selectedTags.innerHTML = '<span style="color: #a0a8b4; font-size: 0.8rem;">Никто не выбран</span>';
        return;
    }
    
    for (const contactId of selectedContacts) {
        const contact = allContacts.find(c => c.id === contactId);
        if (contact) {
            const tag = createContactTag(contact, contactId, updateSelectedTagsUISimple, () => {
                const groupNameInput = document.getElementById('group-name');
                const createBtn = document.getElementById('create-group-submit');
                if (groupNameInput && createBtn) {
                    const nameValid = groupNameInput.value.trim().length >= 3;
                    createBtn.disabled = !(nameValid && selectedContacts.length >= 1);
                }
            });
            selectedTags.appendChild(tag);
        }
    }
}

/**
 * Загрузка контактов для группы
 */
async function loadContactsForGroup(container) {
    try {
        console.log('📥 Загрузка контактов...');
        const { service } = await initGrpc();
        
        // Получаем всех пользователей
        const usersResponse = await service.getUsers('');
        const allUsers = usersResponse.users || [];
        
        // Исключаем текущего пользователя
        const contacts = allUsers.filter(user => user.id !== state.currentUser?.id);
        allContacts = contacts;
        
        console.log(`📋 Загружено ${contacts.length} контактов для выбора`);
        
        renderContacts(contacts, container, selectedContacts);
    } catch (error) {
        console.error('❌ Ошибка загрузки контактов:', error);
        if (container) {
            container.innerHTML = '<div class="error" style="padding: 20px; text-align: center; color: #e05a5a;">Ошибка загрузки контактов</div>';
        }
    }
}

/**
 * Фильтрация контактов
 */
function filterContactsForGroup(query, container) {
    if (!query) {
        renderContacts(allContacts, container, selectedContacts);
        return;
    }
    
    const filtered = allContacts.filter(user => 
        (user.name?.toLowerCase().includes(query) || 
         user.email?.toLowerCase().includes(query))
    );
    
    renderContacts(filtered, container, selectedContacts);
}