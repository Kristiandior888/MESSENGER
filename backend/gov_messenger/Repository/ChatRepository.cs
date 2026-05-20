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

        public async Task<bool> IsUserInChatAsync(Guid userId, Guid chatId)
        {
            return await _db.ChatParticipants
                .AnyAsync(cp => cp.user_id == userId && cp.chat_id == chatId);
        }

        public async Task<ChatEntity?> FindPrivateChatAsync(Guid user1, Guid user2)
        {
            return await _db.Chats
                .Include(c => c.participants)
                .Where(c => c.type == (short)ChatType.Private)
                .FirstOrDefaultAsync(c =>
                    c.participants.Count == 2 &&
                    c.participants.Any(
                        p => p.user_id == user1) &&
                    c.participants.Any(
                        p => p.user_id == user2));
        }

        public async Task<ChatEntity> CreateAsync(
            ChatEntity chat)
        {
            _db.Chats.Add(chat);

            await _db.SaveChangesAsync();

            return chat;
        }
    }
}
