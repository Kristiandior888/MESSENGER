using System.Security.Cryptography;
using System.Text;

namespace gov_messenger.Services
{
    public class EncryptionService
    {
        private readonly byte[] _key;

        public EncryptionService()
        {
            var keyString = Environment.GetEnvironmentVariable("MASTER_KEY");
            _key = Convert.FromBase64String(keyString);
        }

        public (byte[] ciphertext, byte[] nonce, byte[] tag) Encrypt(string plaintext)
        {
            var nonce = RandomNumberGenerator.GetBytes(12);
            var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
            var ciphertext = new byte[plaintextBytes.Length];
            var tag = new byte[16];
            using var aes = new AesGcm(_key);
            aes.Encrypt(nonce, plaintextBytes, ciphertext, tag);

            return (ciphertext, nonce, tag);
        }

        public string Decrypt(byte[] ciphertext, byte[] nonce, byte[] tag)
        {
            if (ciphertext == null || nonce == null || tag == null)
                return "";

            var plaintext = new byte[ciphertext.Length];
            using var aes = new AesGcm(_key);
            aes.Decrypt(nonce, ciphertext, tag, plaintext);

            return Encoding.UTF8.GetString(plaintext);
        }
    }
}
