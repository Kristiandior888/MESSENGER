using gov_messenger.Entities;
using gov_messenger.Services;
using Grpc.Core;

namespace gov_messenger.GrpcServices
{
    public class AdminGrpcService : Admin.AdminBase
    {
        private readonly UserService _userService;

        public AdminGrpcService(UserService userService)
        {
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

        private UserResponse MapUser(UserEntity user)
        {
            return new UserResponse
            {
                Success = true,
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

        public override async Task<UserResponse> CreateUser(
            CreateUserRequest request,
            ServerCallContext context)
        {
            EnsureSuperAdmin(context);

            try
            {
                var user = await _userService.CreateUserAsync(request.Email, request.Name);

                return MapUser(user);
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

        public override async Task<UserResponse> EditUser(
            EditUserRequest request,
            ServerCallContext context)
        {
            EnsureSuperAdmin(context);

            try
            {
                var user = await _userService.EditUserAsync(
                    request.UserId,
                    request.Email,
                    request.Name
                );

                return MapUser(user);
            }
            catch (Exception ex)
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, ex.Message));
            }
        }

        public override async Task<UserResponse> DeleteUser(
            DeleteUserRequest request,
            ServerCallContext context)
        {
            EnsureSuperAdmin(context);

            try
            {
                var user = await _userService.DeleteUserAsync(request.UserId);

                return MapUser(user);
            }
            catch (Exception ex)
            {
                throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
            }
        }
    }
}
