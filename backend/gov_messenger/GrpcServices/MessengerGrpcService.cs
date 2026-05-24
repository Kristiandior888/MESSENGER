using gov_messenger.Repository;
using gov_messenger.Services;
using Grpc.Core;
using static Grpc.Core.Metadata;

namespace gov_messenger.GrpcServices
{
    public class MessengerGrpcService : Messenger.MessengerBase
    {
        private readonly MessageService _messageService;
        private readonly AuthService _authService;
        private readonly UserService _userService;
        private readonly ChatService _chatService;
        private readonly JwtService _jwtService;
        private readonly EncryptionService _encryptionService;

        public MessengerGrpcService(
            MessageService messageService,
            AuthService authService,
            ChatService chatService,
            UserService userService,
            JwtService jwtService,
            EncryptionService encryptionService)
        {
            _messageService = messageService;
            _authService = authService;
            _userService = userService;
            _chatService = chatService;
            _jwtService = jwtService;
            _encryptionService = encryptionService;
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
                    LastSeen = user.last_seen != null ? new DateTimeOffset(user.last_seen.Value)
                        .ToUnixTimeSeconds() : 0,
                    Role = user.role,
                    IsBlocked = user.is_blocked,
                    IsDeleted = user.is_deleted,
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
            var currentUserGuid = Guid.Parse(userId);

            var response = new GetChatsResponse();

            foreach (var chat in chats)
            {
                var participants = await _chatService.GetParticipantsByChatId(chat.id);
                var grpcParticipants = new List<User>();

                foreach (var participant in participants)
                {
                    var user = await _userService.GetUserByIdAsync(participant.user_id.ToString());
                    if (user != null)
                    {
                        var isCurrentUser = user.id == currentUserGuid;
                        grpcParticipants.Add(new User
                        {
                            Id = user.id.ToString(),
                            Email = user.email ?? "",
                            Name = user.name ?? (isCurrentUser ? "��" : user.email?.Split('@')[0] ?? "������������"),
                            AvatarUrl = user.avatar_url ?? "",
                            Status = user.status ?? "",
                            LastSeen = user.last_seen != null
                                ? new DateTimeOffset(user.last_seen.Value).ToUnixTimeSeconds()
                                : 0,
                            Role = user.role,
                            IsBlocked = user.is_blocked,
                            IsDeleted = user.is_deleted,
                        });
                    }
                }

                Message? lastMessage = null;
                var messages = await _messageService.GetMessagesAsync(chat.id.ToString(), 1, "");
                if (messages.Any())
                {
                    var lastMsg = messages.First();
                    var text = _encryptionService.Decrypt(lastMsg.ciphertext, lastMsg.nonce, lastMsg.tag);

                    lastMessage = new Message
                    {
                        Id = lastMsg.id.ToString(),
                        Chatid = lastMsg.chatid.ToString(),
                        SenderId = lastMsg.sender_id.ToString(),
                        Text = text ?? "",
                        Timestamp = new DateTimeOffset(lastMsg.timestamp).ToUnixTimeSeconds()
                    };
                }

                response.Chats.Add(new Chat
                {
                    Id = chat.id.ToString(),
                    Name = chat.name ?? "",
                    Type = (ChatType)chat.type,
                    AvatarUrl = chat.avatar_url ?? "",
                    CreatedAt = new DateTimeOffset(chat.created_at).ToUnixTimeSeconds(),
                    Participants = { grpcParticipants },
                    LastMessage = lastMessage,
                    UnreadCount = 0
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

                var participants = await _chatService.GetParticipantsByChatId(chat.id);
                var grpcParticipants = new List<User>();
                var currentUserGuid = Guid.Parse(userId);

                foreach (var participant in participants)
                {
                    var user = await _userService.GetUserByIdAsync(participant.user_id.ToString());
                    if (user != null)
                    {
                        grpcParticipants.Add(new User
                        {
                            Id = user.id.ToString(),
                            Email = user.email ?? "",
                            Name = user.name ?? (user.id == currentUserGuid ? "��" : user.email?.Split('@')[0] ?? "������������"),
                            AvatarUrl = user.avatar_url ?? "",
                            Status = user.status ?? "",
                            LastSeen = user.last_seen != null
                                ? new DateTimeOffset(user.last_seen.Value).ToUnixTimeSeconds()
                                : 0,
                            Role = user.role,
                            IsBlocked = user.is_blocked,
                            IsDeleted = user.is_deleted,
                        });
                    }
                }

                return new CreateChatResponse
                {
                    Chat = new Chat
                    {
                        Id = chat.id.ToString(),
                        Name = chat.name ?? "",
                        Type = (ChatType)chat.type,
                        CreatedAt = new DateTimeOffset(chat.created_at).ToUnixTimeSeconds(),
                        Participants = { grpcParticipants }
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

            string text;

            if (entity.ciphertext != null)
            {
                text = _encryptionService.Decrypt(entity.ciphertext, entity.nonce, entity.tag);
            }
            else
            {
                text = entity.text ?? "";
            }

            return new SendMessageResponse
            {
                Success = true,
                Message = new Message
                {
                    Id = entity.id.ToString(),
                    Chatid = entity.chatid.ToString(),
                    SenderId = entity.sender_id.ToString(),
                    Text = text,
                    Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds()
                }
            };
        }

        public override async Task<GetMessagesResponse> GetMessages(
            GetMessagesRequest request,
            ServerCallContext context)
        {
            var userId = context.UserState["userId"] as string;

            if (string.IsNullOrEmpty(userId))
            {
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Unauthorized"));
            }

            var isMember = await _chatService.IsUserInChat(userId, request.Chatid);

            // Если пользователь не участник, возвращаем пустой список (или ошибку, как вам нужно)
            if (!isMember)
            {
                return new GetMessagesResponse(); 
            }

            var messages = await _messageService.GetMessagesAsync(
                request.Chatid,
                request.Limit,
                request.Cursor
            );

            var response = new GetMessagesResponse();

            foreach (var entity in messages)
            {
                var text = _encryptionService.Decrypt(entity.ciphertext, entity.nonce, entity.tag);

                response.Messages.Add(new Message
                {
                    Id = entity.id.ToString(),
                    Chatid = entity.chatid.ToString(),
                    SenderId = entity.sender_id.ToString(),
                    Text = text ?? "",
                    Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds(), 
                    Type = (MessageType)entity.type,
                    Status = MessageStatus.Delivered
                });
            }

            return response;
        }
        public override async Task StreamMessages(
            StreamMessagesRequest request,
            IServerStreamWriter<Message> responseStream,
            ServerCallContext context)
        {
            var cancellationToken = context.CancellationToken;
            var tasks = new List<Task>();
            
            Console.WriteLine($"📡 StreamMessages вызван, Chatids count: {request.Chatids?.Count ?? 0}");
            
            // Проверяем, есть ли чаты для подписки
            if (request.Chatids == null || request.Chatids.Count == 0)
            {
                Console.WriteLine("⚠️ Нет чатов для подписки, ожидаем отключения клиента...");
                // Ждем отключения клиента
                var tcs = new TaskCompletionSource<bool>();
                using (cancellationToken.Register(() => tcs.TrySetResult(true)))
                {
                    await tcs.Task;
                }
                return;
            }
            
            foreach (var chatId in request.Chatids)
            {
                Console.WriteLine($"📡 Подписка на чат: {chatId}");
                var task = _messageService.SubscribeToChat(chatId, responseStream, cancellationToken);
                tasks.Add(task);
            }
            
            // Ждем, пока хотя бы одна задача завершится (клиент отключился)
            await Task.WhenAny(tasks);
            
            Console.WriteLine($"📡 StreamMessages завершен для чатов");
        }
    }
}
