using gov_messenger.Data;
using gov_messenger.Repository;
using gov_messenger.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddGrpc();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
);

builder.Services.AddScoped<MessageRepository>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<ChatRepository>();

builder.Services.AddScoped<MessageService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<EmailService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.MapGrpcService<MessengerGrpcService>();
app.MapGet("/", () => "Backend is running on ports 7212 (HTTPS) and 5077 (HTTP)");

app.Run();
