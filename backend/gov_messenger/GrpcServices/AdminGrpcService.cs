using gov_messenger.Services;
using Grpc.Core;

namespace gov_messenger.GrpcServices
{
    public class AdminGrpcService : Admin.AdminBase
    {
        private readonly AdminService _adminService;

        public AdminGrpcService(AdminService adminService)
        {
            _adminService = adminService;
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
                        : 0
                }
            };
        }
    }
}
