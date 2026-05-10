namespace gov_messenger.Entities
{
    public class MessageEntity
    {
        public Guid id { get; set; }
        public Guid chat_id { get; set; }
        public Guid sender_id { get; set; }
        public string? text { get; set; }
        public short type { get; set; }
        public DateTime timestamp { get; set; }
        public List<FileEntity> files { get; set; } = new();
    }
}
