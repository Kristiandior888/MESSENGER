using gov_messenger.Entities;
using gov_messenger.Repository;
using Grpc.Core;
using System.Collections.Concurrent;

namespace gov_messenger.Services
{
    public class MessageService
    {
        private readonly MessageRepository _messageRepository;
        private readonly FileService _fileService;
        private static readonly ConcurrentDictionary<string, List<IServerStreamWriter<Message>>> _subscribers = new();

        public MessageService(
            MessageRepository messageRepository,
            FileService fileService)
        {
            _messageRepository = messageRepository;
            _fileService = fileService;
        }

        public async Task<MessageEntity> SendMessageAsync(
            string chatId,
            string senderId,
            string text,
            List<string> fileIds,
            short messageType = 0)
        {
            var message = new MessageEntity
            {
                id = Guid.NewGuid(),
                chat_id = Guid.Parse(chatId),
                sender_id = Guid.Parse(senderId),
                text = text,
                type = messageType,
                timestamp = DateTime.UtcNow
            };

            await _messageRepository.AddAsync(message);

            // Link files to message if any were provided
            if (fileIds != null && fileIds.Count > 0)
            {
                var fileGuids = fileIds.Select(fid => Guid.Parse(fid)).ToList();
                await _fileService.LinkFilesToMessageAsync(fileGuids, message.id);
            }

            return message;
        }

        public async Task<List<MessageEntity>> GetMessagesAsync(string chatId, int limit, string cursor)
        {
            return await _messageRepository.GetMessagesAsync(Guid.Parse(chatId), limit, cursor);
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
                    ChatId = message.chat_id.ToString(),
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

        public async Task<List<(MessageEntity, List<FileEntity>)>> GetMessagesWithFilesAsync(
            string chatId,
            int limit,
            string cursor)
        {
            var messages = await _messageRepository.GetMessagesAsync(
                Guid.Parse(chatId),
                limit,
                cursor
            );

            var result = new List<(MessageEntity, List<FileEntity>)>();

            foreach (var message in messages)
            {
                var files = await _fileService.GetFilesByMessageIdAsync(message.id);
                result.Add((message, files));
            }

            return result;
        }
    }
}
