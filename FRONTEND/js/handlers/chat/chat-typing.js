// js/handlers/chat/chat-typing.js
let typingTimeout = null;

export function setupTypingIndicator() {
    const messageField = document.getElementById('message-field');
    let typingTimer = null;
    
    messageField?.addEventListener('input', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            // Отправляем сигнал "печатает" через WebSocket/gRPC
            console.log('✍️ Пользователь печатает...');
        }, 300);
    });
}

export function showTypingIndicator(chatId, userName) {
    const messagesDiv = document.getElementById('messages');
    const existing = document.querySelector('.typing-indicator');
    if (existing) existing.remove();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dots">
            <span>${userName} печатает</span>
            <span>.</span><span>.</span><span>.</span>
        </div>
    `;
    messagesDiv?.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}