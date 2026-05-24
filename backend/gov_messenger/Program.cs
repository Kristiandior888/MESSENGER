using DotNetEnv;
using gov_messenger.Data;
using gov_messenger.GrpcServices;
using gov_messenger.Interceptors;
using gov_messenger.Repository;
using gov_messenger.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography.X509Certificates;
using System.Text;

Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

builder.Services.AddGrpc(options => {options.Interceptors.Add<AuthInterceptor>();});

var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default") + dbPassword)
);

builder.Services.AddSingleton<JwtService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("JWT_KEY"))
            )
        };
    });

builder.WebHost.ConfigureKestrel(options =>
{
    var certPath = Environment.GetEnvironmentVariable("TLS_CERT_PATH");
    var certPassword = Environment.GetEnvironmentVariable("TLS_CERT_PASSWORD");
    var cert = new X509Certificate2(certPath, certPassword, X509KeyStorageFlags.MachineKeySet);

    options.ListenAnyIP(7212, listen =>
    {
        listen.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http2;
        listen.UseHttps(cert);
    });
});

builder.Services.AddScoped<MessageRepository>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<ChatRepository>();
builder.Services.AddScoped<ChatParticipantRepository>();
builder.Services.AddScoped<EmailCodeRepository>();

builder.Services.AddScoped<MessageService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddSingleton<EncryptionService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.MapGrpcService<MessengerGrpcService>();
app.MapGrpcService<AdminGrpcService>();
app.MapGet("/", () => "Backend is running on ports 7212 (HTTPS) and 5077 (HTTP)");

app.Run();
