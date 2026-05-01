using gov_messenger.Entities;
using gov_messenger.Repository;

namespace gov_messenger.Services
{
    public class ChatService
    {
        private readonly ChatRepository _repository;

        public ChatService(ChatRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<ChatEntity>> GetChatsAsync(string userId)
        {
            return await _repository.GetUserChatsAsync(Guid.Parse(userId));
        }

        public async Task<bool> IsUserInChat(string userId, string chatId)
        {
            if (!Guid.TryParse(userId, out var uid) ||
                !Guid.TryParse(chatId, out var cid))
            {
                return false;
            }

            return await _repository.IsUserInChatAsync(uid, cid);
        }
    }
}
