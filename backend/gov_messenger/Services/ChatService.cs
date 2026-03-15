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
    }
}
