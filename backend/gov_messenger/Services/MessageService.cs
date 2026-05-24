using gov_messenger.Entities;
using gov_messenger.Repository;
using Grpc.Core;
using System.Collections.Concurrent;
using static Grpc.Core.Metadata;

namespace gov_messenger.Services
{
    public class MessageService
    {
        private readonly MessageRepository _repository;
        private readonly EncryptionService _encryptionService;
        private static readonly ConcurrentDictionary<string, List<IServerStreamWriter<Message>>> _subscribers = new();

        public MessageService(MessageRepository repository, EncryptionService encryptionService)
        {
            _repository = repository;
            _encryptionService = encryptionService;
        }

        public async Task<MessageEntity> SendMessageAsync(string chatId, string senderId, string text)
        {
            var encrypted = _encryptionService.Encrypt(text);

            var message = new MessageEntity
            {
                id = Guid.NewGuid(),
                chatid = Guid.Parse(chatId),
                sender_id = Guid.Parse(senderId),
                ciphertext = encrypted.ciphertext,
                nonce = encrypted.nonce,
                tag = encrypted.tag,
                timestamp = DateTime.UtcNow
            };

            var result = await _repository.AddAsync(message);
            
            // Notify subs about a new message
            await NotifySubscribers(chatId, result);
            
            return result;
        }

        public async Task<List<MessageEntity>> GetMessagesAsync(string chatId, int limit, string cursor)
        {
            return await _repository.GetMessagesAsync(Guid.Parse(chatId), limit, cursor);
        }

        public async Task SubscribeToChat(string chatId, IServerStreamWriter<Message> stream, CancellationToken cancellationToken)
        {
            if (!_subscribers.ContainsKey(chatId))
            {
                _subscribers[chatId] = new List<IServerStreamWriter<Message>>();
            }
            
            _subscribers[chatId].Add(stream);
            
            try
            {
                // Ожидаем отмены (клиент отключился)
                var tcs = new TaskCompletionSource<bool>();
                using (cancellationToken.Register(() => tcs.TrySetResult(true)))
                {
                    await tcs.Task;
                }
            }
            finally
            {
                _subscribers[chatId].Remove(stream);
                if (_subscribers[chatId].Count == 0)
                {
                    _subscribers.TryRemove(chatId, out _);
                }
            }
        }

        private async Task WaitForDisconnect(CancellationToken cancellationToken)
        {
            var tcs = new TaskCompletionSource<bool>();
            using (cancellationToken.Register(() => tcs.TrySetResult(true)))
            {
                await tcs.Task;
            }
        }

        private async Task NotifySubscribers(string chatId, MessageEntity message)
        {
            if (_subscribers.TryGetValue(chatId, out var streams))
            {
                Console.WriteLine($"📨 Уведомление {streams.Count} подписчиков чата {chatId}");
                
                var text = _encryptionService.Decrypt(message.ciphertext, message.nonce, message.tag);

                var grpcMessage = new Message
                {
                    Id = message.id.ToString(),
                    Chatid = message.chatid.ToString(),
                    SenderId = message.sender_id.ToString(),
                    Text = text,
                    Timestamp = new DateTimeOffset(message.timestamp).ToUnixTimeSeconds()
                };

                var deadStreams = new List<IServerStreamWriter<Message>>();
                
                foreach (var stream in streams.ToList())
                {
                    try
                    {
                        await stream.WriteAsync(grpcMessage);
                        Console.WriteLine($"✅ Сообщение отправлено подписчику чата {chatId}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"❌ Ошибка отправки подписчику: {ex.Message}");
                        deadStreams.Add(stream);
                    }
                }
                
                foreach (var dead in deadStreams)
                {
                    streams.Remove(dead);
                }
            }
            else
            {
                Console.WriteLine($"⚠️ Нет подписчиков для чата {chatId}");
            }
        }
    }
}
