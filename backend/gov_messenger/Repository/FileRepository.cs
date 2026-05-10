using gov_messenger.Data;
using gov_messenger.Entities;
using Microsoft.EntityFrameworkCore;

namespace gov_messenger.Repository
{
    public class FileRepository
    {
        private readonly AppDbContext _db;

        public FileRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<FileEntity> AddAsync(FileEntity file)
        {
            _db.Files.Add(file);
            await _db.SaveChangesAsync();
            return file;
        }

        public async Task<FileEntity?> GetFileByIdAsync(Guid id)
        {
            return await _db.Files.FirstOrDefaultAsync(f => f.id == id);
        }

        public async Task<List<FileEntity>> GetFilesByIdsAsync(List<Guid> ids)
        {
            return await _db.Files
                .Where(f => ids.Contains(f.id))
                .ToListAsync();
        }

        public async Task<List<FileEntity>> GetFilesByMessageIdAsync(Guid messageId)
        {
            return await _db.Files
                .Where(f => f.message_id == messageId)
                .ToListAsync();
        }

        public async Task<bool> UpdateFileMessageIdAsync(Guid fileId, Guid messageId)
        {
            var file = await _db.Files.FirstOrDefaultAsync(f => f.id == fileId);
            if (file == null)
                return false;

            file.message_id = messageId;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task UpdateFilesMessageIdAsync(List<Guid> fileIds, Guid messageId)
        {
            var files = await _db.Files
                .Where(f => fileIds.Contains(f.id))
                .ToListAsync();

            foreach (var file in files)
            {
                file.message_id = messageId;
            }

            await _db.SaveChangesAsync();
        }
    }
}
