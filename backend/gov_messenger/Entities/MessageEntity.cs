namespace gov_messenger.Entities
{
    public class MessageEntity
    {
        public Guid Id { get; set; }
        public string ChatId { get; set; }
        public string SenderId { get; set; }
        public string Text { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
