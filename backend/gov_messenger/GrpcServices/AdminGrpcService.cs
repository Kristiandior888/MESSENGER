using gov_messenger.Services;
using Grpc.Core;

namespace gov_messenger.GrpcServices
{
    public class AdminGrpcService : Admin.AdminBase
    {
        private readonly AdminService _adminService;
        private readonly UserService _userService;

        public AdminGrpcService(
            AdminService adminService,
            UserService userService)
        {
            _adminService = adminService;
            _userService = userService;
        }

        private void EnsureSuperAdmin(ServerCallContext context)
        {
            var role = context.UserState["role"] as string;

            if (role != "super-admin")
            {
                throw new RpcException(new Status(StatusCode.PermissionDenied, "Admins only"));
            }
        }

        public override async Task<CreateUserResponse> CreateUser(
            CreateUserRequest request,
            ServerCallContext context)
        {
            EnsureSuperAdmin(context);

            try
            {
                var user = await _adminService.CreateUserAsync(request.Email, request.Name);

                return new CreateUserResponse
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

            catch (Exception ex)
            {
                throw new RpcException(new Status(StatusCode.AlreadyExists, ex.Message));
            }
        }

        public override async Task<GetUserByEmailResponse> GetUserByEmail(
            GetUserByEmailRequest request,
            ServerCallContext context)
        {
            EnsureSuperAdmin(context);

            var user = await _userService.GetUserByEmailAsync(request.Email);

            if (user == null)
                return new GetUserByEmailResponse { Error = "User not found" };

            return new GetUserByEmailResponse
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

        public override async Task<GetAllUsersResponse> GetAllUsers(
            GetAllUsersRequest request,
            ServerCallContext context)
        {
            EnsureSuperAdmin(context);

            var users = await _userService.GetAllUsersAsync();

            var response = new GetAllUsersResponse();

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
                        ? new DateTimeOffset(user.last_seen.Value).ToUnixTimeSeconds()
                        : 0,
                    Role = user.role,
                    IsBlocked = user.is_blocked,
                    IsDeleted = user.is_deleted,
                });
            }

            return response;
        }
    }
}
