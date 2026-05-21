namespace gov_messenger.Entities
{
    public class ChatParticipantEntity
    {
        public Guid chatid { get; set; }
        public Guid user_id { get; set; }
        public string? role { get; set; } = "member";
        public DateTime joined_at { get; set; }
    }
}
