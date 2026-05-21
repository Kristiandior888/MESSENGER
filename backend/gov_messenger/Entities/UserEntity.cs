namespace gov_messenger.Entities
{
    public class UserEntity
    {
        public Guid id { get; set; }
        public string? email { get; set; }
        public string? password_hash { get; set; }
        public string? name { get; set; }
        public string role { get; set; } = "user";
        public string? avatar_url { get; set; }
        public string? status { get; set; }
        public DateTime? last_seen { get; set; }
        public bool is_blocked { get; set; } = false;
        public bool is_deleted { get; set; } = false;
    }
}
