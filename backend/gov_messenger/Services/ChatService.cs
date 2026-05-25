using gov_messenger.Entities;
using gov_messenger.Repository;

namespace gov_messenger.Services
{
    public class ChatService
    {
        private readonly ChatRepository _chatRepository;
        private readonly ChatParticipantRepository _chatParticipantRepository;

        public ChatService(ChatRepository repository, ChatParticipantRepository chatParticipantRepository)
        {
            _chatRepository = repository;
            _chatParticipantRepository = chatParticipantRepository;
        }

        public async Task<List<ChatEntity>> GetChatsAsync(string userId)
        {
            return await _chatRepository.GetUserChatsAsync(Guid.Parse(userId));
        }

        public async Task<bool> IsUserInChat(string userId, string chatId)
        {
            if (!Guid.TryParse(userId, out var uid) ||
                !Guid.TryParse(chatId, out var cid))
            {
                return false;
            }

            return await _chatRepository.IsUserInChatAsync(uid, cid);
        }

        public async Task<ChatEntity> CreateChatAsync(
            string creatorId,
            ChatType type,
            string? name,
            List<string> participantIds)
        {
            var creatorGuid = Guid.Parse(creatorId);

            var participants = participantIds
                .Select(Guid.Parse)
                .Distinct()
                .ToList();

            if (!participants.Contains(creatorGuid))
            {
                participants.Add(creatorGuid);
            }

            if (type == ChatType.Private)
            {
                if (participants.Count != 2)
                {
                    throw new Exception(
                        "Private chat must contain exactly 2 users");
                }

                var existingChat =
                    await _chatRepository.FindPrivateChatAsync(
                        participants[0],
                        participants[1]);

                if (existingChat != null)
                {
                    return existingChat;
                }
            }

            var chat = new ChatEntity
            {
                id = Guid.NewGuid(),
                name = type == ChatType.Private ? null : name,
                type = (short)type,
                created_at = DateTime.UtcNow
            };

            await _chatRepository.CreateAsync(chat);

            foreach (var userId in participants)
            {
                await _chatParticipantRepository.AddAsync(
                    new ChatParticipantEntity
                    {
                        chatid = chat.id,
                        user_id = userId,
                        role = userId == creatorGuid ? "admin" : "member",
                        joined_at = DateTime.UtcNow
                    });
            }

            return chat;
        }

        public async Task<List<ChatParticipantEntity>> GetParticipantsByChatId(Guid chatId)
        {
            return await _chatParticipantRepository.GetParticipantsByChatIdAsync(chatId);
        }
    }
}
