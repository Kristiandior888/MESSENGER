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
                Id = entity.Id.ToString(),
                ChatId = entity.ChatId,
                Text = entity.Text,
                Timestamp = new DateTimeOffset(entity.Timestamp).ToUnixTimeSeconds()
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
                    Id = entity.Id.ToString(),
                    ChatId = entity.ChatId,
                    SenderId = entity.SenderId,
                    Text = entity.Text,
                    Timestamp = new DateTimeOffset(entity.Timestamp).ToUnixTimeSeconds()
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
                Id = user.Id.ToString(),
                Email = user.Email,
                Name = user.Name ?? "",
                AvatarUrl = user.AvatarUrl ?? "",
                Status = user.Status ?? "",
                LastSeen = user.LastSeen != null
                    ? new DateTimeOffset(user.LastSeen.Value).ToUnixTimeSeconds()
                    : 0
            };

            return new LoginResponse
            {
                Success = true,
                Token = user.Id.ToString(), // temp token
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
                    Id = user.Id.ToString(),
                    Email = user.Email,
                    Name = user.Name ?? "",
                    AvatarUrl = user.AvatarUrl ?? "",
                    Status = user.Status ?? "",
                    LastSeen = user.LastSeen != null
                        ? new DateTimeOffset(user.LastSeen.Value).ToUnixTimeSeconds()
                        : 0
                }
            };
        }

        public override async Task<GetChatsResponse> GetChats(
            GetChatsRequest request,
            ServerCallContext context)
        {
            var userId = context.RequestHeaders.FirstOrDefault(h => h.Key == "user-id")?.Value;

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
                    Id = chat.Id.ToString(),
                    Name = chat.Name ?? "",
                    Type = (ChatType)chat.Type,
                    AvatarUrl = chat.AvatarUrl ?? "",
                    CreatedAt = new DateTimeOffset(chat.CreatedAt).ToUnixTimeSeconds()
                });
            }

            return response;
        }
    }
}
