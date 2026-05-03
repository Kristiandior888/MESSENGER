// js/handlers/groups/group-info.js
import { state } from '../../app.js';
import { initGrpc } from '../chat/chat-core.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { isGroupChat } from '../../utils/chatUtils.js';
import { updateChatsList } from './index.js';

/**
 * Показать информацию о группе
 */
export function showGroupInfo(groupId) {
    const group = state.chats?.find(c => c.id === groupId);
    if (!group || !isGroupChat(group)) {
        console.error('Группа не найдена или это не групповой чат');
        return;
    }
    
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
            showError('Не удалось загрузить информацию о группе');
        });
}

/**
 * Настройка обработчиков модального окна информации о группе
 */
async function setupGroupInfoModalHandlers(group) {
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
    
    // Заполняем название группы
    if (groupNameEl) {
        groupNameEl.textContent = group.name || 'Групповой чат';
    }
    
    // Настройки уведомлений
    if (notificationsCheckbox) {
        notificationsCheckbox.checked = group.notifications !== false;
        notificationsCheckbox.addEventListener('change', (e) => {
            group.notifications = e.target.checked;
            console.log(`Уведомления для группы ${group.name}: ${e.target.checked}`);
            // TODO: Сохранить настройку на сервере
        });
    }
    
    // Настройки закрепления
    if (pinnedCheckbox) {
        pinnedCheckbox.checked = group.pinned || false;
        pinnedCheckbox.addEventListener('change', (e) => {
            group.pinned = e.target.checked;
            updateChatsList();
            console.log(`Закрепление для группы ${group.name}: ${e.target.checked}`);
            // TODO: Сохранить настройку на сервере
        });
    }
    
    // Загружаем участников
    await loadAndRenderParticipants(group, participantsList, participantsCount);
    
    // Закрытие модального окна
    const closeModalWindow = () => modal.remove();
    
    if (closeBtn) closeBtn.addEventListener('click', closeModalWindow);
    if (closeBtn2) closeBtn2.addEventListener('click', closeModalWindow);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalWindow();
    });
}

/**
 * Загрузка и отображение участников группы
 */
async function loadAndRenderParticipants(group, participantsList, participantsCount) {
    if (!participantsList) return;
    
    try {
        const { service } = await initGrpc();
        const participants = [];
        
        for (const userId of group.participant_ids || []) {
            try {
                const response = await service.getUser(userId);
                if (response.user) {
                    participants.push({
                        id: userId,
                        name: response.user.name || response.user.email.split('@')[0],
                        email: response.user.email,
                        avatar: response.user.avatar_url,
                        isCreator: userId === group.created_by
                    });
                }
            } catch (error) {
                console.error('Ошибка загрузки участника:', error);
                participants.push({
                    id: userId,
                    name: 'Неизвестный',
                    email: '',
                    avatar: null,
                    isCreator: false
                });
            }
        }
        
        if (participantsCount) {
            participantsCount.textContent = participants.length;
        }
        
        renderParticipantsList(participantsList, participants);
    } catch (error) {
        console.error('Ошибка загрузки участников группы:', error);
        participantsList.innerHTML = '<div class="error" style="padding: 20px; text-align: center;">Ошибка загрузки участников</div>';
    }
}

/**
 * Отрисовка списка участников
 */
function renderParticipantsList(container, participants) {
    container.innerHTML = '';
    
    participants.forEach(participant => {
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        participantItem.innerHTML = `
            <div class="participant-avatar">
                ${participant.avatar ? `<img src="${participant.avatar}" alt="avatar">` : '👤'}
            </div>
            <div class="participant-info">
                <div class="participant-name">
                    ${escapeHtml(participant.name)}
                    ${participant.isCreator ? '<span class="creator-badge" title="Создатель группы">👑</span>' : ''}
                </div>
                <div class="participant-email">${escapeHtml(participant.email)}</div>
            </div>
        `;
        container.appendChild(participantItem);
    });
}

/**
 * Показать ошибку
 */
function showError(message) {
    const { showErrorMessage } = require('../chat/chat-ui.js');
    showErrorMessage(message);
}