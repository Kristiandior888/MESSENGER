namespace gov_messenger.Entities
{
    public class RefreshTokenEntity
    {
        public Guid id { get; set; }
        public Guid user_id { get; set; }
        public required string token_hash { get; set; }
        public DateTime expires_at { get; set; }
        public DateTime created_at { get; set; }
        public DateTime? revoked_at { get; set; }
        public string? device { get; set; }
        public string? ip_address { get; set; }

    }
}
