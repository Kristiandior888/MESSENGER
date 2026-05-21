namespace gov_messenger.Entities
{
    public class ChatEntity
    {
        public Guid id { get; set; }
        public string? name { get; set; }
        public short type { get; set; }
        public string? avatar_url { get; set; }
        public DateTime created_at { get; set; }
    }
}
