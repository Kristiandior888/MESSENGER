using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Repository
{
    public class ChatRepository
    {
        private readonly AppDbContext _db;

        public ChatRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<ChatEntity>> GetUserChatsAsync(Guid userId)
        {
            var chatIds = await _db.ChatParticipants
                .Where(cp => cp.user_id == userId)
                .Select(cp => cp.chat_id)
                .ToListAsync();

            return await _db.Chats.Where(c => chatIds.Contains(c.id)).ToListAsync();
        }
    }
}
