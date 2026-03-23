using gov_messenger;
using Grpc.Core;  
using System.Collections.Concurrent;  

namespace gov_messenger.Services
{
    public class MessengerGrpcService : Messenger.MessengerBase
    {
        private readonly MessageService _messageService;
        private readonly AuthService _authService;
        private readonly UserService _userService;
        private readonly ChatService _chatService;

        public MessengerGrpcService(
            MessageService messageService, 
            AuthService authService,
            ChatService chatService,
            UserService userService)
        {
            _messageService = messageService;
            _authService = authService;
            _userService = userService;
            _chatService = chatService;
        }

        // ... остальные методы ...

        public override async Task StreamMessages(
            StreamMessagesRequest request,
            IServerStreamWriter<Message> responseStream,
            ServerCallContext context)
        {
            var tasks = new List<Task>();
            var cancellationToken = context.CancellationToken;
            
            foreach (var chatId in request.ChatIds)
            {
                var task = _messageService.SubscribeToChat(chatId, responseStream, cancellationToken);
                tasks.Add(task);
            }
            
            await Task.WhenAll(tasks);
        }
    }
}