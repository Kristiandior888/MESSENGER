namespace gov_messenger.Entities
{
    public class FileEntity
    {
        public Guid id { get; set; }
        public string? file_name { get; set; }
        public string? content_type { get; set; }
        public Int64 size { get; set; }
        public string? path { get; set; }
        public DateTime created_at { get; set; }
    }
}
