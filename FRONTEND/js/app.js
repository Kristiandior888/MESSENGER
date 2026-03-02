

// СОСТОЯНИЕ ПРИЛОЖЕНИЯ 
const state = {
    isAuthenticated: false,
    currentUser: null,
    currentChat: 'Лучший коллега',
    userAvatar: null  // поле для аватара
};

// Экспортируем, чтобы другие файлы могли использовать
export { state }  ;