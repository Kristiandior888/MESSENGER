using gov_messenger.Entities;
using gov_messenger.Repository;
using System.Security.Cryptography;
using System.Text;

namespace gov_messenger.Services
{
    public class AuthService
    {
        private readonly UserRepository _userRepository;
        private readonly EmailService _emailService;

        private static Dictionary<string, (string hash, DateTime expiry)> _codes = new();

        public AuthService(UserRepository userRepository, EmailService emailService)
        {
            _userRepository = userRepository;
            _emailService = emailService;
        }

        public async Task<bool> RequestCodeAsync(string email)
        {
            var user = await _userRepository.GetByEmailAsync(email);

            if (user == null)
                return false;

            var code = new Random().Next(100000, 999999).ToString();

            var hash = Hash(code);

            _codes[email] = (hash, DateTime.UtcNow.AddMinutes(5));

            await _emailService.SendCodeAsync(email, code);

            return true;
        }

        public async Task<UserEntity?> VerifyCodeAsync(string email, string code)
        {
            if (!_codes.TryGetValue(email, out var entry))
                return null;

            if (entry.expiry < DateTime.UtcNow)
                return null;

            var hash = Hash(code);

            if (entry.hash != hash)
                return null;

            _codes.Remove(email); // one-time code

            return await _userRepository.GetByEmailAsync(email);
        }

        private string Hash(string input)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToBase64String(bytes);
        }
    }
}
