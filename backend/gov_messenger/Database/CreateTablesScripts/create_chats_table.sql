CREATE TABLE chats (
    id UUID PRIMARY KEY,
    name TEXT,
    type SMALLINT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
