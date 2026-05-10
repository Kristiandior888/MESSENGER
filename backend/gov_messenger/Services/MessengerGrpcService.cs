using gov_messenger;
using gov_messenger.Entities;
using gov_messenger.Repository;
using Grpc.Core;
using static Grpc.Core.Metadata;

namespace gov_messenger.Services
{
    public class MessengerGrpcService : Messenger.MessengerBase
    {
        private readonly MessageService _messageService;
        private readonly AuthService _authService;
        private readonly UserService _userService;
        private readonly ChatService _chatService;
        private readonly JwtService _jwtService;
        private readonly FileService _fileService;

        public MessengerGrpcService(
            MessageService messageService,
            AuthService authService,
            ChatService chatService,
            UserService userService,
            JwtService jwtService,
            FileService fileService)
        {
            _messageService = messageService;
            _authService = authService;
            _userService = userService;
            _chatService = chatService;
            _jwtService = jwtService;
            _fileService = fileService;
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
                user.email
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
                        : 0
                }
            };
        }

        public override async Task<GetUserResponse> GetUser(
            GetUserRequest request,
            ServerCallContext context)
        {
            var userId = context.UserState["userId"] as string;

            var user = await _userService.GetUserAsync(userId);

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
                        : 0
                }
            };
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

        public override async Task<SendMessageResponse> SendMessage(
            SendMessageRequest request,
            ServerCallContext context)
        {
            var senderId = context.UserState["userId"] as string;

            if (senderId == null)
            {
                throw new RpcException(new Status(StatusCode.Unauthenticated, "No user"));
            }

            var isMember = await _chatService.IsUserInChat(senderId, request.ChatId);

            if (!isMember)
            {
                throw new RpcException(new Status(StatusCode.PermissionDenied, "Access denied"));
            }

            var entity = await _messageService.SendMessageAsync(
                request.ChatId,
                senderId,
                request.Text,
                request.FileIds.ToList(),
                (short)request.Type
            );

            // Get associated files for the response
            var files = await _fileService.GetFilesByMessageIdAsync(entity.id);

            var grpcMessage = new Message
            {
                Id = entity.id.ToString(),
                ChatId = entity.chat_id.ToString(),
                SenderId = entity.sender_id.ToString(),
                Text = entity.text,
                Type = (MessageType)entity.type,
                Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds()
            };

            foreach (var file in files)
            {
                grpcMessage.Files.Add(new File
                {
                    Id = file.id.ToString(),
                    FileName = file.file_name ?? "",
                    ContentType = file.content_type ?? "",
                    Size = file.size
                });
            }

            return new SendMessageResponse
            {
                Success = true,
                Message = grpcMessage
            };
        }

        public override async Task<GetMessagesResponse> GetMessages(
            GetMessagesRequest request,
            ServerCallContext context)
        {
            var userId = context.UserState["userId"] as string;

            var isMember = await _chatService.IsUserInChat(userId, request.ChatId);

            if (!isMember)
            {
                throw new RpcException(new Status(StatusCode.PermissionDenied, "Access denied"));
            }

            var messages = await _messageService.GetMessagesWithFilesAsync(
                request.ChatId,
                request.Limit,
                request.Cursor
            );

            var response = new GetMessagesResponse();

            foreach (var (entity, files) in messages)
            {
                var grpcMessage = new Message
                {
                    Id = entity.id.ToString(),
                    ChatId = entity.chat_id.ToString(),
                    SenderId = entity.sender_id.ToString(),
                    Text = entity.text,
                    Timestamp = new DateTimeOffset(entity.timestamp).ToUnixTimeSeconds()
                };

                foreach (var file in files)
                {
                    grpcMessage.Files.Add(new File
                    {
                        Id = file.id.ToString(),
                        FileName = file.file_name ?? "",
                        ContentType = file.content_type ?? "",
                        Size = file.size
                    });
                }

                response.Messages.Add(grpcMessage);
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

            foreach (var chatId in request.ChatIds)
            {
                var task = _messageService.SubscribeToChat(chatId, responseStream, cancellationToken);
                tasks.Add(task);
            }

            await Task.WhenAll(tasks);
        }

        public override async Task<UploadFileResponse> UploadFile(
            IAsyncStreamReader<UploadFileRequest> requestStream,
            ServerCallContext context)
        {
            var fileId = Guid.NewGuid();
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");

            if (!Directory.Exists(uploadsDir))
                Directory.CreateDirectory(uploadsDir);

            var path = Path.Combine(uploadsDir, fileId.ToString());

            await using var fs = new FileStream(path, FileMode.Create);

            string fileName = "";
            string contentType = "";
            long size = 0;

            await foreach (var request in requestStream.ReadAllAsync())
            {
                // Handle FileMetadata from oneof
                if (request.DataCase == UploadFileRequest.DataOneofCase.Metadata)
                {
                    fileName = request.Metadata.FileName;
                    contentType = request.Metadata.ContentType;
                }
                // Handle chunk data from oneof
                else if (request.DataCase == UploadFileRequest.DataOneofCase.Chunk)
                {
                    var bytes = request.Chunk.ToByteArray();
                    size += bytes.Length;
                    await fs.WriteAsync(bytes);
                }
            }

            await _fileService.SaveFileAsync(
                fileId,
                fileName,
                contentType,
                path,
                size
            );

            return new UploadFileResponse
            {
                FileId = fileId.ToString()
            };
        }

        public override async Task DownloadFile(
            DownloadFileRequest request,
            IServerStreamWriter<DownloadFileResponse> responseStream,
            ServerCallContext context)
        {
            var file = await _fileService.GetFileAsync(request.FileId);

            if (file == null)
                throw new RpcException(new Status(StatusCode.NotFound, "File not found"));

            await using var fs = new FileStream(file.path, FileMode.Open);

            var buffer = new byte[64 * 1024];

            int bytesRead;
            while ((bytesRead = await fs.ReadAsync(buffer)) > 0)
            {
                await responseStream.WriteAsync(new DownloadFileResponse
                {
                    Chunk = Google.Protobuf.ByteString.CopyFrom(buffer, 0, bytesRead)
                });
            }
        }
    }
}
