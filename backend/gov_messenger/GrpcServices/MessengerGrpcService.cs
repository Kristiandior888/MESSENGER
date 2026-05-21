using gov_messenger.Services;
using Grpc.Core;

namespace gov_messenger.GrpcServices
{
    public class MessengerGrpcService : Messenger.MessengerBase
    {
        private readonly MessageService _messageService;
        private readonly AuthService _authService;
        private readonly UserService _userService;
        private readonly ChatService _chatService;
        private readonly JwtService _jwtService;

        public MessengerGrpcService(
            MessageService messageService,
            AuthService authService,
            ChatService chatService,
            UserService userService,
            JwtService jwtService)
        {
            _messageService = messageService;
            _authService = authService;
            _userService = userService;
            _chatService = chatService;
            _jwtService = jwtService;
        }

        public override async Task<RequestEmailCodeResponse> RequestEmailCode(
            RequestEmailCodeRequest request,
            ServerCallContext context)
        {
            var ok = await _authService.RequestCodeAsync(request.Email);

            if (!ok)
            {
                return new RequestEmailCodeResponse
                {
                    Success = false,
                    Error = "User not found"
                };
            }

            return new RequestEmailCodeResponse
            {
                Success = true
            };
        }

        public override async Task<LoginResponse> VerifyEmailCode(
            VerifyEmailCodeRequest request,
            ServerCallContext context)
        {
            var user = await _authService.VerifyCodeAsync(
                request.Email,
                request.Code
            );

            if (user == null)
            {
                return new LoginResponse
                {
                    Success = false,
                    Error = "Invalid or expired code"
                };
            }

            var token = _jwtService.GenerateToken(
                user.id.ToString(),
                user.email,
                user.role
            );

            return new LoginResponse
            {
                Success = true,
                Token = token,
                User = new User
                {
                    Id = user.id.ToString(),
                    Email = user.email,
                    Name = user.name ?? "",
                    AvatarUrl = user.avatar_url ?? "",
                    Status = user.status ?? "",
                    LastSeen = user.last_seen != null
                        ? new DateTimeOffset(user.last_seen.Value).ToUnixTimeSeconds()
                        : 0,
                    Role = user.role,
                    IsBlocked = user.is_blocked,
                    IsDeleted = user.is_deleted,
                }
            };
        }

        public override async Task<GetUserResponse> GetUser(
            GetUserRequest request,
            ServerCallContext context)
        {
            var userId = context.UserState["userId"] as string;

            var user = await _userService.GetUserByIdAsync(userId);

            if (user == null)
                return new GetUserResponse { Error = "User not found" };

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
                        : 0,
                    Role = user.role,
                    IsBlocked = user.is_blocked,
                    IsDeleted = user.is_deleted,
                }
            };
        }

        public override async Task<GetUsersResponse> GetUsers(
            GetUsersRequest request,
            ServerCallContext context)
        {
            var users = await _userService.GetUsersAsync(
                request.Search
            );

            var response = new GetUsersResponse();

            foreach (var user in users)
            {
                response.Users.Add(new User
                {
                    Id = user.id.ToString(),
                    Email = user.email,
                    Name = user.name ?? "",
                    AvatarUrl = user.avatar_url ?? "",
                    Status = user.status ?? "",
                    LastSeen = user.last_seen != null
                        ? new DateTimeOffset(
                            user.last_seen.Value)
                        .ToUnixTimeSeconds()
                        : 0
                });
            }

            return response;
        }

        public override async Task<GetChatsResponse> GetChats(
            GetChatsRequest request,
            ServerCallContext context)
        {
            var userId = context.UserState["userId"] as string;

            if (string.IsNullOrEmpty(userId))
            {
                return new GetChatsResponse
                {
                    Error = "Unauthorized"
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

        public override async Task<CreateChatResponse> CreateChat(
            CreateChatRequest request,
            ServerCallContext context)
        {
            var userId =
                context.UserState["userId"] as string;

            if (string.IsNullOrEmpty(userId))
            {
                throw new RpcException(
                    new Status(
                        StatusCode.Unauthenticated,
                        "Unauthorized"));
            }

            try
            {
                var chat = await _chatService
                    .CreateChatAsync(
                        userId,
                        request.Type,
                        request.Name,
                        request.ParticipantIds.ToList());

                return new CreateChatResponse
                {
                    Chat = new Chat
                    {
                        Id = chat.id.ToString(),
                        Name = chat.name ?? "",
                        Type = (ChatType)chat.type,
                        CreatedAt =
                            new DateTimeOffset(
                                chat.created_at)
                            .ToUnixTimeSeconds()
                    }
                };
            }
            catch (Exception ex)
            {
                return new CreateChatResponse
                {
                    Error = ex.Message
                };
            }
        }

        public override async Task<SendMessageResponse> SendMessage(
            SendMessageRequest request,
            ServerCallContext context)
        {
            var senderId = context.UserState["userId"] as string;

            if (senderId == null)
            {
                throw new RpcException(new Status(StatusCode.Unauthenticated, "No user"));
            }

            var isMember = await _chatService.IsUserInChat(senderId, request.Chatid);

            if (!isMember)
            {
                throw new RpcException(new Status(StatusCode.PermissionDenied, "Access denied"));
            }

            var entity = await _messageService.SendMessageAsync(
                request.Chatid,
                senderId,
                request.Text);

            return new SendMessageResponse
            {
                Success = true,
                Message = new Message
                {
                    Id = entity.id.ToString(),
                    Chatid = entity.chatid.ToString(),
                    SenderId = entity.sender_id.ToString(),
                    Text = entity.text,
                    Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds()
                }
            };
        }

        public override async Task<GetMessagesResponse> GetMessages(
            GetMessagesRequest request,
            ServerCallContext context)
        {
            var userId = context.UserState["userId"] as string;

            var isMember = await _chatService.IsUserInChat(userId, request.Chatid);

            if (!isMember)
            {
                throw new RpcException(new Status(StatusCode.PermissionDenied, "Access denied"));
            }

            var messages = await _messageService.GetMessagesAsync(
                request.Chatid,
                request.Limit,
                request.Cursor
            );

            var response = new GetMessagesResponse();

            foreach (var entity in messages)
            {
                response.Messages.Add(new Message
                {
                    Id = entity.id.ToString(),
                    Chatid = entity.chatid.ToString(),
                    SenderId = entity.sender_id.ToString(),
                    Text = entity.text,
                    Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds()
                });
            }

            return response;
        }

        public override async Task StreamMessages(
            StreamMessagesRequest request,
            IServerStreamWriter<Message> responseStream,
            ServerCallContext context)
        {
            var tasks = new List<Task>();
            var cancellationToken = context.CancellationToken;

            foreach (var chatId in request.Chatids)
            {
                var task = _messageService.SubscribeToChat(chatId, responseStream, cancellationToken);
                tasks.Add(task);
            }

            await Task.WhenAll(tasks);
        }
    }
}
