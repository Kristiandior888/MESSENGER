using gov_messenger.Data;
using gov_messenger.Entities;

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
    }
}
