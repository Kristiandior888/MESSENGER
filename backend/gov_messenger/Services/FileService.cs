using gov_messenger.Entities;
using gov_messenger.Repository;

namespace gov_messenger.Services
{
    public class FileService
    {
        private readonly FileRepository _repository;

        public FileService(FileRepository repository)
        {
            _repository = repository;
        }

        public async Task<string> SaveFileAsync(string uploaderId, string fileName, Stream stream)
        {
            var fileId = Guid.NewGuid();
            var path = Path.Combine("uploads", fileId.ToString());

            await using var fs = new FileStream(path, FileMode.Create);

            await stream.CopyToAsync(fs);

            var file = new FileEntity
            {
                id = fileId,
                uploader_id = Guid.Parse(uploaderId),
                file_name = fileName,
                file_path = path,
                mime_type = "application/octet-stream",
                size = fs.Length,
                uploaded_at = DateTime.UtcNow
            };

            await _repository.AddAsync(file);

            return fileId.ToString();
        }

        public async Task<string?> GetFilePathAsync(string fileId)
        {
            var file = await _repository.GetAsync(Guid.Parse(fileId));
            return file?.file_path;
        }
    }
}
