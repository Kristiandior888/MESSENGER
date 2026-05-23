namespace gov_messenger.Entities
{
    public class MessageEntity
    {
        public Guid id { get; set; }
        public Guid chatid { get; set; }
        public Guid sender_id { get; set; }
        public string? text { get; set; }
        public byte[]? ciphertext { get; set; }
        public byte[]? nonce { get; set; }
        public byte[]? tag { get; set; }
        public short type { get; set; }
        public DateTime timestamp { get; set; }
    }
}
