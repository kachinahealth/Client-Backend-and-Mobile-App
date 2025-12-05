-- Migration: Update news_updates table to handle both text and file content
-- Run this SQL in your Supabase SQL editor to update the existing news_updates table

-- Add new columns to support file uploads
ALTER TABLE news_updates
ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'file'));

ALTER TABLE news_updates
ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE news_updates
ADD COLUMN IF NOT EXISTS file_name TEXT;

ALTER TABLE news_updates
ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE news_updates
ADD COLUMN IF NOT EXISTS mime_type TEXT;

ALTER TABLE news_updates
ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

-- Make body column optional (nullable) for file-only content
ALTER TABLE news_updates
ALTER COLUMN body DROP NOT NULL;

-- Make clinical_trial_id optional (nullable) since not all news items are trial-specific
ALTER TABLE news_updates
ALTER COLUMN clinical_trial_id DROP NOT NULL;

-- Update existing records to have content_type = 'text'
UPDATE news_updates
SET content_type = 'text'
WHERE content_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN news_updates.content_type IS 'Type of content: text or file';
COMMENT ON COLUMN news_updates.body IS 'Text content (null for file-only news items)';
COMMENT ON COLUMN news_updates.file_url IS 'Full URL to uploaded file in storage';
COMMENT ON COLUMN news_updates.file_name IS 'Original filename of uploaded file';
COMMENT ON COLUMN news_updates.file_size IS 'File size in bytes';
COMMENT ON COLUMN news_updates.mime_type IS 'MIME type (e.g., application/pdf)';
COMMENT ON COLUMN news_updates.storage_bucket IS 'Storage bucket name';
COMMENT ON COLUMN news_updates.storage_path IS 'Storage path within bucket';
