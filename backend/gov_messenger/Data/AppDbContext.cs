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
        public DbSet<EmailCodeEntity> EmailCodes { get; set; }
        public DbSet<FileEntity> Files { get; set; }
        public DbSet<MessageFileEntity> MessageFiles { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ChatParticipantEntity>()
                .HasKey(cp => new { cp.chat_id, cp.user_id });
        }
    }
}
