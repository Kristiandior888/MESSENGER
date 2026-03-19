using gov_messenger;
using Grpc.Core;

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

        public override async Task<StubResponse> Stub(
            StubRequest request,
            ServerCallContext context)
        {
            return new StubResponse
            {
                Msg = "QQQQQQQQQQQQQQQQQQQQQQQQQQQQQ"
            };
        }

        public override async Task<SendMessageResponse> SendMessage(
            SendMessageRequest request,
            ServerCallContext context)
        {
            var entity = await _messageService.SendMessageAsync(request.ChatId, request.SenderId, request.Text);

            var message = new Message
            {
                Id = entity.id.ToString(),
                ChatId = entity.chat_id.ToString(),
                SenderId = entity.sender_id.ToString(),
                Text = entity.text,
                Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds()
            };

            return new SendMessageResponse
            {
                Success = true,
                Message = message
            };
        }

        public override async Task<GetMessagesResponse> GetMessages(
            GetMessagesRequest request,
            ServerCallContext context)
        {
            var messages = await _messageService.GetMessagesAsync(
                request.ChatId,
                request.Limit,
                request.Cursor
            );

            var response = new GetMessagesResponse();

            foreach (var entity in messages)
            {
                response.Messages.Add(new Message
                {
                    Id = entity.id.ToString(),
                    ChatId = entity.chat_id.ToString(),
                    SenderId = entity.sender_id.ToString(),
                    Text = entity.text,
                    Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds()
                });
            }

            return response;
        }

        public override async Task<LoginResponse> Login(LoginRequest request, ServerCallContext context)
        {
            var user = await _authService.LoginAsync(
                request.Email,
                request.Password
            );

            if (user == null)
            {
                return new LoginResponse
                {
                    Success = false,
                    Error = "Invalid email or password"
                };
            }

            var grpcUser = new User
            {
                Id = user.id.ToString(),
                Email = user.email,
                Name = user.name ?? "",
                AvatarUrl = user.avatar_url ?? "",
                Status = user.status ?? "",
                LastSeen = user.last_seen != null
                    ? new DateTimeOffset(user.last_seen.Value).ToUnixTimeSeconds()
                    : 0
            };

            return new LoginResponse
            {
                Success = true,
                Token = user.id.ToString(), // temp token
                User = grpcUser
            };
        }

        public override async Task<GetUserResponse> GetUser(
            GetUserRequest request,
            ServerCallContext context)
        {
            var user = await _userService.GetUserAsync(request.UserId);

            if (user == null)
            {
                return new GetUserResponse
                {
                    Error = "User not found"
                };
            }

            return new GetUserResponse
            {
                User = new User
                {
                    Id = user.id.ToString(),
                    Email = user.email,
                    Name = user.name ?? "",
                    AvatarUrl = user.avatar_url ?? "",
                    Status = user.status ?? "",
                    LastSeen = user.last_seen != null
                        ? new DateTimeOffset(user.last_seen.Value).ToUnixTimeSeconds()
                        : 0
                }
            };
        }

        public override async Task<GetChatsResponse> GetChats(
            GetChatsRequest request,
            ServerCallContext context)
        {
            var authHeader = context.RequestHeaders.FirstOrDefault(h => h.Key == "authorization")?.Value;
            var userId = authHeader?.Replace("Bearer ", "");

            // var userId = context.RequestHeaders.FirstOrDefault(h => h.Key == "user-id")?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return new GetChatsResponse
                {
                    Error = "User id missing"
                };
            }

            var chats = await _chatService.GetChatsAsync(userId);

            var response = new GetChatsResponse();

            foreach (var chat in chats)
            {
                response.Chats.Add(new Chat
                {
                    Id = chat.id.ToString(),
                    Name = chat.name ?? "",
                    Type = (ChatType)chat.type,
                    AvatarUrl = chat.avatar_url ?? "",
                    CreatedAt = new DateTimeOffset(chat.created_at).ToUnixTimeSeconds()
                });
            }

            return response;
        }
    }
}
