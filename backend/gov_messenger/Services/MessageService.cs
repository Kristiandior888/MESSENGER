using gov_messenger;
using gov_messenger.Entities;
using gov_messenger.Repository;
using gov_messenger.Data;
using Grpc.Core;

namespace gov_messenger.Services
{
    public class MessageService
    {
        private readonly MessageRepository _repository;

        public MessageService(MessageRepository repository)
        {
            _repository = repository;
        }

        public async Task<MessageEntity> SendMessageAsync(string chatId, string senderId, string text)
        {
            var message = new MessageEntity
            {
                id = Guid.NewGuid(),
                chat_id = chatId,
                sender_id = senderId,
                text = text,
                timestamp = DateTime.UtcNow
            };

            return await _repository.AddAsync(message);
        }

        public async Task<List<MessageEntity>> GetMessagesAsync(string chatId, int limit, string cursor)
        {
            return await _repository.GetMessagesAsync(chatId, limit, cursor);
        }
    }
}
