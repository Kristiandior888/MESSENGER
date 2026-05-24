using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;
using System;

namespace gov_messenger.Repository
{
    public class MessageRepository
    {
        private readonly AppDbContext _db;

        public MessageRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<MessageEntity> AddAsync(MessageEntity message)
        {
            _db.Messages.Add(message);
            await _db.SaveChangesAsync();
            return message;
        }

    public async Task<List<MessageEntity>> GetMessagesAsync(Guid chatId, int limit, string cursor)
        {
            var query = _db.Messages.Where(m => m.chatid == chatId);

            if (!string.IsNullOrEmpty(cursor) && long.TryParse(cursor, out var cursorTimestamp))
            {
                // cursor - это timestamp в секундах
                var cursorDateTime = DateTimeOffset.FromUnixTimeSeconds(cursorTimestamp).UtcDateTime;
                query = query.Where(m => m.timestamp < cursorDateTime);
            }

            return await query
                .OrderByDescending(m => m.timestamp)
                .Take(limit)
                .ToListAsync();
        }
    }
}
