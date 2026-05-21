using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Repository
{
    public class ChatParticipantRepository
    {
        private readonly AppDbContext _db;

        public ChatParticipantRepository(
            AppDbContext db)
        {
            _db = db;
        }

        public async Task AddAsync(
            ChatParticipantEntity participant)
        {
            _db.ChatParticipants.Add(participant);
            await _db.SaveChangesAsync();
        }

        public async Task<List<ChatParticipantEntity>> GetParticipantsByChatIdAsync(Guid chatId)
        {
            return await _db.ChatParticipants
                .Where(cp => cp.chatid == chatId)
                .ToListAsync();
        }

        public async Task<List<ChatParticipantEntity>> GetParticipantsByUserIdAsync(Guid userId)
        {
            return await _db.ChatParticipants
                .Where(cp => cp.user_id == userId)
                .ToListAsync();
        }

        public async Task<ChatParticipantEntity?> GetParticipantAsync(Guid chatId, Guid userId)
        {
            return await _db.ChatParticipants
                .FirstOrDefaultAsync(cp => cp.chatid == chatId && cp.user_id == userId);
        }
    }
}