using MailKit.Net.Smtp;
using MimeKit;
using MailKit.Security;

namespace gov_messenger.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendCodeAsync(string email, string code)
        {
            var message = new MimeMessage();

            message.From.Add(new MailboxAddress(
                "Gov Messenger",
                _config["Email:From"]
            ));

            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = "Your login code";

            message.Body = new TextPart("plain")
            {
                Text = $"Your verification code: {code}"
            };

            using var client = new SmtpClient();

            await client.ConnectAsync(
                _config["Email:SmtpHost"],
                int.Parse(_config["Email:SmtpPort"]),
                SecureSocketOptions.StartTls
            );

            var emailPassword = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");

            await client.AuthenticateAsync(
                _config["Email:Username"],
                emailPassword
            );

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}
