using gov_messenger.Entities;
using gov_messenger.Repository;
using Microsoft.EntityFrameworkCore;
using System;

namespace gov_messenger.Services
{
    public class UserService
    {
        private readonly UserRepository _userRepository;

        public UserService(UserRepository repository)
        {
            _userRepository = repository;
        }

        public async Task<UserEntity?> CreateUserAsync(string email, string name)
        {
            var existing = await _userRepository.GetUserByEmailAsync(email);

            if (existing != null)
                throw new Exception("User already exists");

            var user = new UserEntity
            {
                id = Guid.NewGuid(),
                email = email.Trim().ToLower(),
                name = name
            };

            return await _userRepository.AddUserAsync(user);
        }

        public async Task<UserEntity?> GetUserByIdAsync(string id)
        {
            if (!Guid.TryParse(id, out var guid))
            {
                return null;
            }

            return await _userRepository.GetUserByIdAsync(guid);
        }

        public async Task<UserEntity?> GetUserByEmailAsync(string email)
        {
            return await _userRepository.GetUserByEmailAsync(email);
        }

        public async Task<List<UserEntity>> GetAllUsersAsync()
        {
            return await _userRepository.GetAllUsersAsync();
        }

        public async Task<UserEntity> EditUserAsync(string userId, string? email, string? name)
        {
            if (!Guid.TryParse(userId, out var id))
                throw new Exception("Invalid user id");

            var user = await _userRepository.GetUserByIdAsync(id);

            if (user == null)
                throw new Exception("User not found");

            if (!string.IsNullOrEmpty(email))
                user.email = email.Trim().ToLower();

            if (!string.IsNullOrEmpty(name))
                user.name = name;

            await _userRepository.EditUserAsync(user);

            return user;
        }

        public async Task<UserEntity> DeleteUserAsync(string userId)
        {
            if (!Guid.TryParse(userId, out var id))
                throw new Exception("Invalid user id");

            var user = await _userRepository.GetUserByIdAsync(id);

            if (user == null)
                throw new Exception("User not found");

            user.is_deleted = true;

            await _userRepository.EditUserAsync(user);

            return user;
        }
    }
}
