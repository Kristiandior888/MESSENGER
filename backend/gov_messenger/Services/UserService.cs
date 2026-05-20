using gov_messenger.Entities;
using gov_messenger.Repository;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Services
{
    public class UserService
    {
        private readonly UserRepository _repository;

        public UserService(UserRepository repository)
        {
            _repository = repository;
        }

        public async Task<UserEntity?> GetUserAsync(string id)
        {
            if (!Guid.TryParse(id, out var guid))
            {
                return null;
            }

            return await _repository.GetByIdAsync(guid);
        }

        public async Task<List<UserEntity>> GetUsersAsync(string? search)
        {
            return await _repository.GetUsersAsync(search);
        }
    }
}
