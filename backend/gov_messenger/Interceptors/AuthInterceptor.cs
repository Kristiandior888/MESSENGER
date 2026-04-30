using Grpc.Core;
using Grpc.Core.Interceptors;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace gov_messenger.Interceptors
{
    public class AuthInterceptor : Interceptor
    {
        private readonly IConfiguration _config;

        public AuthInterceptor(IConfiguration config)
        {
            _config = config;
        }

        public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request,
        ServerCallContext context,
        UnaryServerMethod<TRequest, TResponse> continuation)
        {
            var method = context.Method;

            if (method.Contains("RequestEmailCode") || 
                method.Contains("VerifyEmailCode"))
            {
                return await continuation(request, context);
            }

            var authHeader = context.RequestHeaders
                .FirstOrDefault(h => h.Key == "authorization")?.Value;

            if (string.IsNullOrEmpty(authHeader))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing token"));

            var token = authHeader.Replace("Bearer ", "");

            var handler = new JwtSecurityTokenHandler();
            
            var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY");

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _config["Jwt:Issuer"],

                ValidateAudience = true,
                ValidAudience = _config["Jwt:Audience"],

                ValidateLifetime = true,

                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
            };

            var principal = handler.ValidateToken(token, validationParameters, out _);

            var userId = principal.Claims.FirstOrDefault(c => c.Type == "uid")?.Value;

            if (userId == null)
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid token"));

            context.UserState["userId"] = userId;

            return await continuation(request, context);
        }
    }
}
