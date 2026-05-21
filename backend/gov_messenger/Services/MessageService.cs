using gov_messenger.Entities;
using gov_messenger.Repository;
using Grpc.Core;
using System.Collections.Concurrent;

namespace gov_messenger.Services
{
    public class MessageService
    {
        private readonly MessageRepository _repository;
        private static readonly ConcurrentDictionary<string, List<IServerStreamWriter<Message>>> _subscribers = new();

        public MessageService(MessageRepository repository)
        {
            _repository = repository;
        }

        public async Task<MessageEntity> SendMessageAsync(string chatId, string senderId, string text)
        {
            var message = new MessageEntity
            {
                id = Guid.NewGuid(),
                chatid = Guid.Parse(chatId),
                sender_id = Guid.Parse(senderId),
                text = text,
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
                // Wait until the client disconnects
                await Task.Delay(-1, cancellationToken);
            }
            catch (TaskCanceledException)
            {
                // The client disconnected, do nothing
            }
            finally
            {
                // Remove the stream of subs
                _subscribers[chatId].Remove(stream);
                if (_subscribers[chatId].Count == 0)
                {
                    _subscribers.TryRemove(chatId, out _);
                }
            }
        }

        private async Task NotifySubscribers(string chatId, MessageEntity message)
        {
            if (_subscribers.TryGetValue(chatId, out var streams))
            {
                var grpcMessage = new Message
                {
                    Id = message.id.ToString(),
                    Chatid = message.chatid.ToString(),
                    SenderId = message.sender_id.ToString(),
                    Text = message.text,
                    Timestamp = new DateTimeOffset(message.timestamp).ToUnixTimeSeconds()
                };

                var deadStreams = new List<IServerStreamWriter<Message>>();
                
                foreach (var stream in streams.ToList())
                {
                    try
                    {
                        await stream.WriteAsync(grpcMessage);
                    }
                    catch
                    {
                        deadStreams.Add(stream);
                    }
                }
                
                // Remove dead streams
                foreach (var dead in deadStreams)
                {
                    streams.Remove(dead);
                }
            }
        }
    }
}
