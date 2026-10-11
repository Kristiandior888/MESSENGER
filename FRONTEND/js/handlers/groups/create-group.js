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

    const existingModal = document.getElementById('create-group-modal');
    if (existingModal) existingModal.remove();

    const modal = createModalElement();
    document.body.appendChild(modal);

    console.log('✅ Модальное окно добавлено в DOM');

    setupGroupModalHandlers(modal);
}

/**
 * Создание модального окна через DOM API
 */
function createModalElement() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'create-group-modal';

    const container = document.createElement('div');
    container.className = 'modal-container';

    // Header
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

    // Название группы
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

    // Участники
    const participantsGroup = document.createElement('div');
    participantsGroup.className = 'form-group';

    const participantsLabel = document.createElement('label');
    participantsLabel.textContent = 'Выберите участников (минимум 1)';

    const searchDiv = document.createElement('div');
    searchDiv.className = 'search-contacts';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'contact-search';
    searchInput.className = 'form-input';
    searchInput.placeholder = 'Поиск по имени или email...';

    searchDiv.appendChild(searchInput);

    const contactsList = document.createElement('div');
    contactsList.id = 'contacts-list';
    contactsList.className = 'contacts-list';
    contactsList.innerHTML = '<div class="no-contacts">Загрузка контактов...</div>';

    const selectedDiv = document.createElement('div');
    selectedDiv.className = 'selected-contacts';
    selectedDiv.id = 'selected-contacts';

    const selectedTitle = document.createElement('div');
    selectedTitle.className = 'selected-title';
    selectedTitle.innerHTML = 'Выбрано: <span id="selected-count">0</span>';

    const selectedTags = document.createElement('div');
    selectedTags.id = 'selected-tags';
    selectedTags.className = 'selected-tags';
    selectedTags.innerHTML = '<span class="selected-empty">Никто не выбран</span>';

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

    if (!createBtn || !contactsList) {
        console.error('❌ Ключевые элементы модалки не найдены');
        return;
    }

    selectedContacts = [];
    allContacts = [];

    loadContactsForGroup(contactsList);

    if (contactSearch) {
        contactSearch.addEventListener('input', (e) => {
            filterContactsForGroup(e.target.value.toLowerCase(), contactsList);
        });
    }

    const closeModalWindow = () => {
        console.log('🔚 Закрытие модального окна');
        if (modal && modal.parentNode) modal.remove();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModalWindow);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModalWindow);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalWindow();
    });

    function validateForm() {
        const nameValid = groupNameInput && groupNameInput.value.trim().length >= 3;
        const contactsValid = selectedContacts.length >= 1;
        if (createBtn) createBtn.disabled = !(nameValid && contactsValid);
    }

    if (groupNameInput) {
        groupNameInput.addEventListener('input', validateForm);
    }

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

            const response = await service.createChat('GROUP', groupName, selectedContacts);

            console.log('📨 Ответ сервера:', response);

            if (response && response.chat) {
                await loadChatsFromServer();

                if (response.chat.id) {
                    state.currentChat = response.chat.id;
                }

                closeModalWindow();

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

    // Рендер тегов выбранных
    async function updateSelectedTagsUI() {
        if (!selectedTags || !selectedCount) return;

        selectedCount.textContent = selectedContacts.length;
        selectedTags.innerHTML = '';

        if (selectedContacts.length === 0) {
            selectedTags.innerHTML = '<span class="selected-empty">Никто не выбран</span>';
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
 * Тег выбранного контакта
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
        container.innerHTML = '<div class="no-contacts">Нет контактов для добавления</div>';
        return;
    }

    contactsToRender.forEach(contact => {
        const isSelected = selectedIds.includes(contact.id);
        const contactItem = document.createElement('div');
        contactItem.className = `contact-item ${isSelected ? 'selected' : ''}`;
        contactItem.setAttribute('data-contact-id', contact.id);

        const displayName = contact.name || contact.email?.split('@')[0] || 'Пользователь';

        contactItem.innerHTML = `
            <div class="contact-card">
                <div class="contact-avatar-circle">
                    ${contact.avatar_url
                        ? `<img src="${contact.avatar_url}" alt="avatar">`
                        : '👤'}
                </div>
                <div class="contact-card-info">
                    <div class="contact-card-name">${escapeHtml(displayName)}</div>
                    <div class="contact-card-email">${escapeHtml(contact.email || '')}</div>
                </div>
                <div class="contact-card-check">${isSelected ? '✓' : ''}</div>
            </div>
        `;

        contactItem.addEventListener('click', () => {
            if (selectedContacts.includes(contact.id)) {
                selectedContacts = selectedContacts.filter(id => id !== contact.id);
            } else {
                selectedContacts.push(contact.id);
            }

            renderContacts(contactsToRender, container, selectedContacts);
            updateSelectedTagsUISimple();

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

async function updateSelectedTagsUISimple() {
    const selectedTags = document.getElementById('selected-tags');
    const selectedCount = document.getElementById('selected-count');

    if (!selectedTags || !selectedCount) return;

    selectedCount.textContent = selectedContacts.length;
    selectedTags.innerHTML = '';

    if (selectedContacts.length === 0) {
        selectedTags.innerHTML = '<span class="selected-empty">Никто не выбран</span>';
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

        const usersResponse = await service.getUsers('');
        const allUsers = usersResponse.users || [];

        const contacts = allUsers.filter(user => user.id !== state.currentUser?.id);
        allContacts = contacts;

        console.log(`📋 Загружено ${contacts.length} контактов для выбора`);

        renderContacts(contacts, container, selectedContacts);
    } catch (error) {
        console.error('❌ Ошибка загрузки контактов:', error);
        if (container) {
            container.innerHTML = '<div class="no-contacts">Ошибка загрузки контактов</div>';
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