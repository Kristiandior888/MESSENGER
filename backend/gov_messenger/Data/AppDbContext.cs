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

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(
            ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ChatParticipants
            modelBuilder.Entity<ChatParticipantEntity>(entity =>
            {
                entity.ToTable("ChatParticipants");

                entity.HasKey(e =>
                    new { e.chat_id, e.user_id });

                entity.Property(e => e.chat_id)
                    .HasColumnName("chat_id");

                entity.Property(e => e.user_id)
                    .HasColumnName("user_id");

                entity.Property(e => e.role)
                    .HasColumnName("role");

                entity.Property(e => e.joined_at)
                    .HasColumnName("joined_at");
            });
        }
    }
}
