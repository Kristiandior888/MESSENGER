using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;


namespace gov_messenger.Repository
{
    public class RefreshTokenRepository
    {
        private readonly AppDbContext _db;

        public RefreshTokenRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task CreateAsync(RefreshTokenEntity token)
        {
            _db.RefreshTokens.Add(token);
            await _db.SaveChangesAsync();
        }

        public async Task<RefreshTokenEntity?> GetByHashAsync(string hash)
        {
            return await _db.RefreshTokens
                .FirstOrDefaultAsync(t => t.token_hash == hash && t.revoked_at == null);
        }

        public async Task DeleteAsync(Guid id)
        {
            var token = await _db.RefreshTokens.FindAsync(id);

            if (token != null)
            {
                _db.RefreshTokens.Remove(token);
                await _db.SaveChangesAsync();
            }
        }

        public async Task DeleteAllForUser(Guid userId)
        {
            var tokens = _db.RefreshTokens.Where(t => t.user_id == userId);

            _db.RefreshTokens.RemoveRange(tokens);
            await _db.SaveChangesAsync();
        }
    }
}
