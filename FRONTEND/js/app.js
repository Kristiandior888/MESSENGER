// СОСТОЯНИЕ ПРИЛОЖЕНИЯ 
const state = {
    isAuthenticated: false,
    currentUser: null,
    currentChat: null,
    userAvatar: null,
    jwtToken: null,
    refreshToken: null,
    chats: [
        //тут были чаты для примера 
    ],
};

const jwt = localStorage.getItem('jwt_token');
const refresh = localStorage.getItem('refresh_token');
const userData = localStorage.getItem('userData');

if (jwt && refresh && userData) {
    state.token = jwt;
    state.refreshToken = refresh;
    state.currentUser = JSON.parse(userData);
    state.isAuthenticated = true;
}

export { state };