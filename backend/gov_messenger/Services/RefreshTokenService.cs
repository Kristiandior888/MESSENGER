using gov_messenger.Entities;
using gov_messenger.Repository;
using System.Security.Cryptography;
using System.Text;

namespace gov_messenger.Services
{
    public class RefreshTokenService
    {
        private readonly RefreshTokenRepository _repo;
        private readonly JwtService _jwtService;

        public RefreshTokenService(
            RefreshTokenRepository repo,
            JwtService jwtService)
        {
            _repo = repo;
            _jwtService = jwtService;
        }

        public string GenerateRefreshToken()
        {
            var bytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);

            return Convert.ToBase64String(bytes);
        }

        public string HashToken(string token)
        {
            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(hash);
        }

        public async Task<(string jwt, string refresh)> CreateTokens(UserEntity user)
        {
            var jwt = _jwtService.GenerateToken(user.id.ToString(), user.email);

            var refresh = GenerateRefreshToken();
            var hash = HashToken(refresh);

            await _repo.CreateAsync(new RefreshTokenEntity
            {
                id = Guid.NewGuid(),
                user_id = user.id,
                token_hash = hash,
                created_at = DateTime.UtcNow,
                expires_at = DateTime.UtcNow.AddDays(7)
            });

            return (jwt, refresh);
        }

        public async Task<(string jwt, string refresh)?> Refresh(string refreshToken)
        {
            var hash = HashToken(refreshToken);

            var stored = await _repo.GetByHashAsync(hash);

            if (stored == null || stored.expires_at < DateTime.UtcNow)
                return null;

            await _repo.DeleteAsync(stored.id);

            var userId = stored.user_id;

            var jwt = _jwtService.GenerateToken(userId.ToString(), "");

            var newRefresh = GenerateRefreshToken();
            var newHash = HashToken(newRefresh);

            await _repo.CreateAsync(new RefreshTokenEntity
            {
                id = Guid.NewGuid(),
                user_id = userId,
                token_hash = newHash,
                created_at = DateTime.UtcNow,
                expires_at = DateTime.UtcNow.AddDays(7)
            });

            return (jwt, newRefresh);
        }

        public async Task Logout(Guid userId)
        {
            await _repo.DeleteAllForUser(userId);
        }
    }
}
