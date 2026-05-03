using gov_messenger.Data;
using gov_messenger.Entities;

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
    }
}
