// СОСТОЯНИЕ ПРИЛОЖЕНИЯ 
const state = {
    isAuthenticated: false,
    currentUser: null,
    currentChat: 'Лучший коллега',
    userAvatar: null,
    chats: [
        {
            id: 'chat1',
            name: 'Лучший коллега',
            type: 'private', // private или group
            participants: ['user1', 'user2'],
            createdBy: 'user1',
            createdAt: '2024-01-01',
            lastMessage: 'привет!',
            unreadCount: 0
        },
        {
            id: 'chat2',
            name: 'Команда ы',
            type: 'group',
            participants: ['user1', 'user3', 'user4'],
            createdBy: 'user1',
            createdAt: '2024-01-15',
            lastMessage: 'Собрание в 15:00',
            unreadCount: 2
        },
        {
            id: 'chat3',
            name: 'Проект по захвату мира',
            type: 'group',
            participants: ['user1', 'user2', 'user5', 'user6'],
            createdBy: 'user2',
            createdAt: '2024-02-01',
            lastMessage: 'когда готово?',
            unreadCount: 0
        }
    ]
};

export { state };