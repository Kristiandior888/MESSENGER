CREATE TABLE messages (
    id UUID PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    type SMALLINT NOT NULL,
    text TEXT,
    file_id UUID,
    ciphertext BYTEA,
    nonce BYTEA
);
