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
                .Select(cp => cp.chatid)
                .ToListAsync();

            return await _db.Chats.Where(c => chatIds.Contains(c.id)).ToListAsync();
        }

        public async Task<ChatEntity?> GetChatByIdAsync(Guid chatId)
        {
            return await _db.Chats.FirstOrDefaultAsync(c => c.id == chatId);
        }

        public async Task<bool> IsUserInChatAsync(Guid userId, Guid chatId)
        {
            return await _db.ChatParticipants
                .AnyAsync(cp => cp.user_id == userId && cp.chatid == chatId);
        }

        public async Task<ChatEntity?> FindPrivateChatAsync(Guid user1, Guid user2)
        {
            return await _db.Chats
                .Where(c => c.type == 0)
                .Where(c =>
                    _db.ChatParticipants.Count(
                        p => p.chatid == c.id) == 2)
                .Where(c =>
                    _db.ChatParticipants.Any(
                        p => p.chatid == c.id &&
                             p.user_id == user1))
                .Where(c =>
                    _db.ChatParticipants.Any(
                        p => p.chatid == c.id &&
                             p.user_id == user2))
                .FirstOrDefaultAsync();
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
