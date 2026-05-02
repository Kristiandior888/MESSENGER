using gov_messenger.Entities;
using gov_messenger.Repository;
using MimeKit;
using static System.Net.Mime.MediaTypeNames;

namespace gov_messenger.Services
{
    public class AdminService
    {
        private readonly UserRepository _userRepository;
        private readonly AuthService _authService;

        public AdminService(
            UserRepository userRepository,
            AuthService authService)
        {
            _userRepository = userRepository;
            _authService = authService;
        }

        public async Task<UserEntity?> CreateUserAsync(string email, string name)
        {
            var existing = await _userRepository.GetByEmailAsync(email);

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
    }
}
