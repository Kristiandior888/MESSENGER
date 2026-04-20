using gov_messenger.Entities;
using gov_messenger.Repository;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

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

            // ВРЕМЕННО: проверяем и старый и новый формат
            bool isValid = false;
            
            // Проверка для старых паролей (открытый текст)
            if (user.password_hash == password)
            {
                isValid = true;
                // Обновляем пароль на хэшированный
                await UpgradePasswordAsync(user.id, password);
            }
            // Проверка для новых паролей (PBKDF2)
            else if (user.password_hash != null && user.password_hash.Contains(":"))
            {
                isValid = VerifyPassword(password, user.password_hash);
            }

            if (!isValid)
                return null;

            return user;
        }

        private bool VerifyPassword(string password, string storedHash)
        {
            if (string.IsNullOrEmpty(storedHash))
                return false;

            var parts = storedHash.Split(':');
            var salt = Convert.FromBase64String(parts[0]);
            var hash = parts[1];

            var newHash = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: 100000,
                numBytesRequested: 256 / 8
            ));

            return newHash == hash;
        }

        private async Task UpgradePasswordAsync(Guid userId, string password)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return;

            byte[] salt = RandomNumberGenerator.GetBytes(128 / 8);
            
            string hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: 100000,
                numBytesRequested: 256 / 8
            ));

            user.password_hash = $"{Convert.ToBase64String(salt)}:{hashed}";
            await _userRepository.UpdateAsync(user);
            
            Console.WriteLine($"Пароль для пользователя {user.email} обновлён на хэш");
        }
    }
}