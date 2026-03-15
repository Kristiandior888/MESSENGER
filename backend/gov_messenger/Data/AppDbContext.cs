using Microsoft.EntityFrameworkCore;
using gov_messenger.Entities;
using System.Collections.Generic;

namespace gov_messenger.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<MessageEntity> Messages { get; set; }
        public DbSet<UserEntity> Users { get; set; }
        public DbSet<ChatEntity> Chats { get; set; }
        public DbSet<ChatParticipantEntity> ChatParticipants { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
    }
}
