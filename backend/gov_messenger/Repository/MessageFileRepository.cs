using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Repository
{
    public class MessageFileRepository
    {
        private readonly AppDbContext _db;

        public MessageFileRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task AddAsync(Guid messageId, Guid fileId)
        {
            _db.MessageFiles.Add(new MessageFileEntity
            {
                message_id = messageId,
                file_id = fileId
            });

            await _db.SaveChangesAsync();
        }

        public async Task<List<Guid>> GetFileIdsByMessageId(Guid messageId)
        {
            return await _db.MessageFiles
                .Where(x => x.message_id == messageId)
                .Select(x => x.file_id)
                .ToListAsync();
        }
    }
}
