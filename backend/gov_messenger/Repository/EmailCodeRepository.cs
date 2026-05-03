using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Repository
{
    public class EmailCodeRepository
    {
        private readonly AppDbContext _db;

        public EmailCodeRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task CreateAsync(EmailCodeEntity code)
        {
            _db.EmailCodes.Add(code);
            await _db.SaveChangesAsync();
        }

        public async Task<EmailCodeEntity?> GetLatestAsync(string email)
        {
            return await _db.EmailCodes
                .Where(c => c.email == email)
                .OrderByDescending(c => c.created_at)
                .FirstOrDefaultAsync();
        }

        public async Task MarkUsedAsync(EmailCodeEntity code)
        {
            code.used = true;
            await _db.SaveChangesAsync();
        }

        public async Task DeleteOldCodes(string email)
        {
            var oldCodes = _db.EmailCodes.Where(c => c.email == email);
            _db.EmailCodes.RemoveRange(oldCodes);
            await _db.SaveChangesAsync();
        }
    }
}
