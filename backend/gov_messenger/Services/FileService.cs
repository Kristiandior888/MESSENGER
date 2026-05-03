using gov_messenger.Entities;
using gov_messenger.Repository;

namespace gov_messenger.Services
{
    public class FileService
    {
        private readonly FileRepository _fileRepository;

        public FileService(FileRepository fileRepository)
        {
            _fileRepository = fileRepository;
        }

        public async Task<FileEntity> SaveFileAsync(
            Guid fileId,
            string fileName,
            string contentType,
            string path,
            long size)
        {
            var entity = new FileEntity
            {
                id = fileId,
                file_name = fileName,
                content_type = contentType,
                path = path,
                size = size,
                created_at = DateTime.UtcNow
            };

            return await _fileRepository.AddAsync(entity);
        }
    }
}
