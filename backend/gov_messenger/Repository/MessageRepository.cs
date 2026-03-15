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

        public async Task<List<MessageEntity>> GetMessagesAsync(string chatId, int limit, string cursor)
        {
            var query = _db.Messages.Where(m => m.ChatId == chatId);

            if (!string.IsNullOrEmpty(cursor))
            {
                var cursorTime = DateTime.Parse(cursor);
                query = query.Where(m => m.Timestamp < cursorTime);
            }

            return await query
                .OrderByDescending(m => m.Timestamp)
                .Take(limit)
                .ToListAsync();
        }
    }
}
