using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Repository
{
    public class UserRepository
    {
        private readonly AppDbContext _db;

        public UserRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<UserEntity?> GetByEmailAsync(string email)
        {
            return await _db.Users.FirstOrDefaultAsync(u => u.email == email);
        }

        public async Task<UserEntity?> GetByIdAsync(Guid id)
        {
            return await _db.Users.FirstOrDefaultAsync(u => u.id == id);
        }

        public async Task<List<UserEntity>> GetUsersAsync(string? search)
        {
            var query = _db.Users
                .Where(u => !u.is_deleted);

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(u =>
                    u.name.Contains(search) ||
                    u.email.Contains(search));
            }

            return await query
                .OrderBy(u => u.name)
                .ToListAsync();
        }
    }
}
