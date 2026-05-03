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

        public async Task<UserEntity?> GetUserByIdAsync(string id)
        {
            if (!Guid.TryParse(id, out var guid))
            {
                return null;
            }

            return await _repository.GetByIdAsync(guid);
        }

        public async Task<UserEntity?> GetUserByEmailAsync(string email)
        {
            return await _repository.GetByEmailAsync(email);
        }

        public async Task<List<UserEntity>> GetAllUsersAsync()
        {
            return await _repository.GetAllUsersAsync();
        }
    }
}
