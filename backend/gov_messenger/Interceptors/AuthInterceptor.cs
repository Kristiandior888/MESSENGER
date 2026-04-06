using Grpc.Core;
using System.IdentityModel.Tokens.Jwt;
using Grpc.Core.Interceptors;

namespace gov_messenger.Interceptors
{
    public class AuthInterceptor : Interceptor
    {
        public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request,
        ServerCallContext context,
        UnaryServerMethod<TRequest, TResponse> continuation)
        {
            var method = context.Method;

            if (method.Contains("Login"))
            {
                return await continuation(request, context);
            }

            var authHeader = context.RequestHeaders
                .FirstOrDefault(h => h.Key == "authorization")?.Value;

            if (string.IsNullOrEmpty(authHeader))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing token"));

            var token = authHeader.Replace("Bearer ", "");

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);

            var userId = jwt.Claims.FirstOrDefault(c => c.Type == "uid")?.Value;

            if (userId == null)
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid token"));

            context.UserState["userId"] = userId;

            return await continuation(request, context);
        }
    }
}
