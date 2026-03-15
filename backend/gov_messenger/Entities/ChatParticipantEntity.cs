namespace gov_messenger.Entities
{
    public class ChatParticipantEntity
    {
        public Guid ChatId { get; set; }
        public Guid UserId { get; set; }
        public string? Role { get; set; }
        public DateTime JoinedAt { get; set; }
    }
}
