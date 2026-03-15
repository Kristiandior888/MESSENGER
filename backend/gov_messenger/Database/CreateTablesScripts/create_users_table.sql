CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT,
    last_seen TIMESTAMP,
    public_key BYTEA,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
