using gov_messenger.Data;
using gov_messenger.Interceptors;
using gov_messenger.Repository;
using gov_messenger.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

builder.Services.AddGrpc(options => {options.Interceptors.Add<AuthInterceptor>();});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])
            )
        };
    });

builder.Services.AddScoped<MessageRepository>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<ChatRepository>();

builder.Services.AddScoped<MessageService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ChatService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.MapGrpcService<MessengerGrpcService>();
app.MapGet("/", () => "Backend is running on ports 7212 (HTTPS) and 5077 (HTTP)");

app.Run();
