using gov_messenger.Entities;
using gov_messenger.Repository;

namespace gov_messenger.Services
{
    public class AuthService
    {
        private readonly UserRepository _userRepository;

        public AuthService(UserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<UserEntity?> LoginAsync(string email, string password)
        {
            var user = await _userRepository.GetByEmailAsync(email);

            if (user == null)
                return null;

            // TODO: gotta implement more complex check
            if (user.password_hash != password)
                return null;

            return user;
        }
    }
}
