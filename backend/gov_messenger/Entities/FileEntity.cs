namespace gov_messenger.Entities
{
    public class FileEntity
    {
        public Guid id { get; set; }
        public Guid uploader_id { get; set; }
        public string? file_name { get; set; }
        public string? file_path { get; set; }
        public string? mime_type { get; set; }
        public long size { get; set; }
        public DateTime uploaded_at { get; set; }
    }
}
