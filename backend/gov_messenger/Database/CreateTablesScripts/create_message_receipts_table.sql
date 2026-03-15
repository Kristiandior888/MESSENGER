CREATE TABLE message_receipts (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    status SMALLINT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);
