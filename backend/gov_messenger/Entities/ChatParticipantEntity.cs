namespace gov_messenger.Entities
{
    public class ChatParticipantEntity
    {
        public Guid chat_id { get; set; }
        public Guid user_id { get; set; }
        public string? role { get; set; }
        public DateTime joined_at { get; set; }
    }
}
