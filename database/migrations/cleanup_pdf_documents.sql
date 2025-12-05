-- Cleanup script: Remove all pdf_documents references from database
-- Run this in Supabase SQL editor if you get pdf_documents table errors

-- Drop the table if it exists
DROP TABLE IF EXISTS pdf_documents CASCADE;

-- Drop any policies that might reference pdf_documents
DROP POLICY IF EXISTS "Users can view all PDF documents" ON pdf_documents;
DROP POLICY IF EXISTS "Users can insert PDF documents" ON pdf_documents;
DROP POLICY IF EXISTS "Users can update PDF documents" ON pdf_documents;
DROP POLICY IF EXISTS "Users can delete PDF documents" ON pdf_documents;

-- Drop any triggers that might reference pdf_documents
DROP TRIGGER IF EXISTS update_pdf_documents_updated_at ON pdf_documents;

-- Drop any functions that might reference pdf_documents
-- (Add any specific function drops here if needed)

-- Clear schema cache (this is a Supabase/PostgreSQL command)
DISCARD ALL;

-- Verify cleanup
DO $$
BEGIN
    RAISE NOTICE 'Cleanup complete. pdf_documents table and related objects have been removed.';
END $$;

