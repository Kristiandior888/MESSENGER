namespace gov_messenger.Entities
{
    public class ChatEntity
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public short Type { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
