namespace gov_messenger.Entities
{
    public class MessageEntity
    {
        public Guid id { get; set; }
        public string chat_id { get; set; }
        public string sender_id { get; set; }
        public string text { get; set; }
        public DateTime timestamp { get; set; }
    }
}
