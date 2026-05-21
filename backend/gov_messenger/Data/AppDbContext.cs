using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<UserEntity> Users { get; set; }
        public DbSet<ChatEntity> Chats { get; set; }
        public DbSet<ChatParticipantEntity> ChatParticipants { get; set; }
        public DbSet<MessageEntity> Messages { get; set; }
        public DbSet<EmailCodeEntity> EmailCodes { get; set; }

        public AppDbContext(
            DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(
            ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<UserEntity>(entity =>
            {
                entity.ToTable("Users");

                entity.HasKey(e => e.id);

                entity.Property(e => e.id)
                    .HasColumnName("id");

                entity.Property(e => e.email)
                    .HasColumnName("email");

                entity.Property(e => e.password_hash)
                    .HasColumnName("password_hash");

                entity.Property(e => e.name)
                    .HasColumnName("name");

                entity.Property(e => e.avatar_url)
                    .HasColumnName("avatar_url");

                entity.Property(e => e.status)
                    .HasColumnName("status");

                entity.Property(e => e.last_seen)
                    .HasColumnName("last_seen");

                entity.Property(e => e.is_deleted)
                    .HasColumnName("is_deleted");
            });

            modelBuilder.Entity<ChatEntity>(entity =>
            {
                entity.ToTable("Chats");

                entity.HasKey(e => e.id);

                entity.Property(e => e.id)
                    .HasColumnName("id");

                entity.Property(e => e.name)
                    .HasColumnName("name");

                entity.Property(e => e.type)
                    .HasColumnName("type");

                entity.Property(e => e.avatar_url)
                    .HasColumnName("avatar_url");

                entity.Property(e => e.created_at)
                    .HasColumnName("created_at");
            });

            modelBuilder.Entity<ChatParticipantEntity>(entity =>
            {
                entity.ToTable("ChatParticipants");

                entity.HasKey(e =>
                    new { e.chatid, e.user_id });

                entity.Property(e => e.chatid)
                    .HasColumnName("chatid");

                entity.Property(e => e.user_id)
                    .HasColumnName("user_id");

                entity.Property(e => e.role)
                    .HasColumnName("role");

                entity.Property(e => e.joined_at)
                    .HasColumnName("joined_at");
            });

            modelBuilder.Entity<MessageEntity>(entity =>
            {
                entity.ToTable("Messages");

                entity.HasKey(e => e.id);

                entity.Property(e => e.chatid)
                    .HasColumnName("chatid");

                entity.Property(e => e.sender_id)
                    .HasColumnName("sender_id");

                entity.Property(e => e.timestamp)
                    .HasColumnName("timestamp");
            });
        }
    }
}
