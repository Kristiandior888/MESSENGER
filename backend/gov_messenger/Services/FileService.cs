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
                created_at = DateTime.UtcNow,
                message_id = Guid.Empty  // Will be set when message is sent
            };

            return await _fileRepository.AddAsync(entity);
        }

        public async Task<FileEntity?> GetFileAsync(string fileId)
        {
            if (!Guid.TryParse(fileId, out var guid))
                return null;

            return await _fileRepository.GetFileByIdAsync(guid);
        }

        public async Task<List<FileEntity>> GetFilesByMessageIdAsync(Guid messageId)
        {
            return await _fileRepository.GetFilesByMessageIdAsync(messageId);
        }

        public async Task LinkFilesToMessageAsync(List<Guid> fileIds, Guid messageId)
        {
            if (fileIds == null || fileIds.Count == 0)
                return;

            await _fileRepository.UpdateFilesMessageIdAsync(fileIds, messageId);
        }
    }
}
