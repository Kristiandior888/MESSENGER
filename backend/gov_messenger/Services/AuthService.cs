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
        private readonly EmailCodeRepository _codeRepository;

        public AuthService(
            UserRepository userRepository,
            EmailService emailService,
            EmailCodeRepository codeRepository)
        {
            _userRepository = userRepository;
            _emailService = emailService;
            _codeRepository = codeRepository;
        }

        public async Task<bool> RequestCodeAsync(string email)
        {
            var user = await _userRepository.GetByEmailAsync(email);

            if (user == null)
                return false;

            await _codeRepository.DeleteOldCodes(email);

            var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

            var hash = Hash(code);

            var entity = new EmailCodeEntity
            {
                email = email,
                code_hash = hash,
                created_at = DateTime.UtcNow,
                expires_at = DateTime.UtcNow.AddMinutes(5),
                used = false
            };

            await _codeRepository.CreateAsync(entity);

            await _emailService.SendCodeAsync(email, code);

            return true;
        }

        public async Task<UserEntity?> VerifyCodeAsync(string email, string code)
        {
            var record = await _codeRepository.GetLatestAsync(email);

            if (record == null)
                return null;

            if (record.used)
                return null;

            if (record.expires_at < DateTime.UtcNow)
                return null;

            var hash = Hash(code);

            if (record.code_hash != hash)
                return null;

            // Disposability
            await _codeRepository.MarkUsedAsync(record);

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
