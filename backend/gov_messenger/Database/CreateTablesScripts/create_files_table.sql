CREATE TABLE files (
    id UUID PRIMARY KEY,
    uploader_id UUID REFERENCES users(id),
    file_name TEXT,
    file_path TEXT,
    mime_type TEXT,
    size BIGINT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
