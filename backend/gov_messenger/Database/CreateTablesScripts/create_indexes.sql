CREATE INDEX idx_messages_chatid
ON messages(chatid);

CREATE INDEX idx_messages_timestamp
ON messages(timestamp);

CREATE INDEX idx_chat_participants_user
ON chat_participants(user_id);

CREATE INDEX idx_message_receipts_user
ON message_receipts(user_id);
