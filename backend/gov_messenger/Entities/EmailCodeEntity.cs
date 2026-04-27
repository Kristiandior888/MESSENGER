namespace gov_messenger.Entities
{
    public class EmailCodeEntity
    {
        public Guid id { get; set; }
        public string email { get; set; }
        public string code_hash { get; set; }
        public DateTime created_at { get; set; }
        public DateTime expires_at { get; set; }
        public bool used { get; set; }
    }
}
