-- =====================================================
-- KachinaHealth Clinical Trials Platform - Storage Setup
-- =====================================================
-- This script provides Supabase storage bucket configuration
-- and file handling examples for the clinical trials platform.
-- =====================================================

-- =====================================================
-- SUPABASE STORAGE BUCKET CREATION
-- =====================================================
-- Note: These commands should be run in the Supabase Dashboard
-- under Settings > Storage, or via the Supabase CLI

/*
SUPABASE CLI COMMANDS TO CREATE PRIVATE BUCKETS:

# Create private buckets for secure file storage
supabase storage bucket create trial-documents --private
supabase storage bucket create training-materials --private
supabase storage bucket create study-protocols --private
supabase storage bucket create news-assets --private
supabase storage bucket create enrollment-docs --private

# Alternative: Create via SQL (if supported in your Supabase version)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('trial-documents', 'trial-documents', false),
  ('training-materials', 'training-materials', false),
  ('study-protocols', 'study-protocols', false),
  ('news-assets', 'news-assets', false),
  ('enrollment-docs', 'enrollment-docs', false);

# Set up RLS policies for storage buckets
# (This would be done automatically by Supabase or via additional policies)
*/

-- =====================================================
-- STORAGE BUCKET CONFIGURATION
-- =====================================================

-- Note: Supabase automatically manages RLS for storage buckets
-- Storage bucket policies are configured at the bucket level via Supabase Dashboard
-- or CLI commands. The table-level RLS policies in your content tables
-- ensure organization-based access control.

-- =====================================================
-- FILE STORAGE SCHEMA VERIFICATION
-- =====================================================
-- Verify that content tables have storage columns

DO $$
BEGIN
    -- Check if storage_path columns exist (they should from schema migration)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'enrollments' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN storage_path TEXT;
        RAISE NOTICE 'Added storage_path to enrollments';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'news_updates' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE news_updates ADD COLUMN storage_path TEXT;
        RAISE NOTICE 'Added storage_path to news_updates';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'training_materials' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE training_materials ADD COLUMN storage_path TEXT;
        RAISE NOTICE 'Added storage_path to training_materials';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'study_protocols' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE study_protocols ADD COLUMN storage_path TEXT;
        RAISE NOTICE 'Added storage_path to study_protocols';
    END IF;

    RAISE NOTICE 'Storage columns verified/added successfully';
END $$;

-- =====================================================
-- FILE UPLOAD WORKFLOW EXAMPLES
-- =====================================================

-- Example 1: Insert enrollment with document attachment
-- This would typically be done by your application after file upload to storage
DO $$
DECLARE
    trial_a_id UUID;
    cerevasc_org_id UUID;
    admin_user_id UUID;
BEGIN
    SELECT id INTO trial_a_id FROM clinical_trials WHERE name = 'Cerevasc Trial A';
    SELECT id INTO cerevasc_org_id FROM organizations WHERE name = 'Cerevasc';
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@cerevasc.com';

    -- Example: Add enrollment with consent form attachment
    INSERT INTO enrollments (
        organization_id,
        clinical_trial_id,
        participant_name,
        enrollment_date,
        created_by,
        notes,
        storage_path
    ) VALUES (
        cerevasc_org_id,
        trial_a_id,
        'Example Patient',
        CURRENT_DATE,
        admin_user_id,
        'Patient enrolled with signed consent form attached',
        'enrollment-docs/example-patient-consent-2024.pdf'
    );

    RAISE NOTICE 'Example enrollment with file attachment inserted';
END $$;

-- Example 2: Update training material with new version
UPDATE training_materials
SET
    storage_path = 'training-materials/device-training-v3.0.pdf',
    updated_at = NOW()
WHERE title = 'Device Implantation Training Module'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Cerevasc');

-- Example 3: Add file reference to files index table
INSERT INTO files (
    organization_id,
    clinical_trial_id,
    bucket,
    path,
    uploaded_by,
    file_name,
    file_size,
    mime_type
)
SELECT
    tm.organization_id,
    tm.clinical_trial_id,
    'training-materials',
    tm.storage_path,
    tm.created_by,
    'device-training-v3.0.pdf',
    2457600, -- 2.4MB in bytes
    'application/pdf'
FROM training_materials tm
WHERE tm.title = 'Device Implantation Training Module'
  AND tm.storage_path IS NOT NULL;

-- =====================================================
-- SIGNED URL GENERATION EXAMPLES
-- =====================================================

/*
SUPABASE SIGNED URL GENERATION

Signed URLs provide secure, temporary access to private files.
They expire after a specified time and include authentication.

Example 1: Generate signed URL for enrollment document (SQL Function)
*/

-- Create a function to generate signed URLs for file access
CREATE OR REPLACE FUNCTION generate_file_signed_url(
    bucket_name TEXT,
    file_path TEXT,
    expires_in_seconds INTEGER DEFAULT 3600
)
RETURNS TEXT AS $$
-- Note: This is a simplified example. In production, you would use
-- Supabase's built-in signed URL functionality or a server-side implementation
BEGIN
    -- This function would integrate with Supabase's storage API
    -- For now, returning a placeholder structure
    RETURN format(
        'https://your-project.supabase.co/storage/v1/object/sign/%s/%s?token=signed-token-here&expires=%s',
        bucket_name,
        file_path,
        extract(epoch from (NOW() + interval '1 hour'))::integer
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
Example 2: Frontend JavaScript - Generate signed URL

// Using Supabase JavaScript client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('your-url', 'your-key')

// Get signed URL for private file
const { data, error } = await supabase.storage
  .from('trial-documents')
  .createSignedUrl('path/to/file.pdf', 3600) // 1 hour expiry

if (data?.signedUrl) {
  // Use the signed URL to display/download the file
  window.open(data.signedUrl, '_blank')
}

Example 3: Backend API endpoint for signed URLs

app.get('/api/files/:bucket/:path', async (req, res) => {
  const { bucket, path } = req.params

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ signedUrl: data.signedUrl })
})

Example 4: SQL query to get file info with signed URL

SELECT
  f.file_name,
  f.bucket,
  f.path,
  f.mime_type,
  f.file_size,
  generate_file_signed_url(f.bucket, f.path, 3600) as signed_url
FROM files f
WHERE f.organization_id = get_user_organization_id()
  AND f.id = 'your-file-id';

*/

-- =====================================================
-- STORAGE CLEANUP EXAMPLES
-- =====================================================

-- Example: Remove file reference when content is deleted
-- This would typically be handled by triggers or application logic

CREATE OR REPLACE FUNCTION cleanup_file_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove file references when content is deleted
    -- Note: Actual file deletion from storage should be handled by application logic

    -- Example: Clean up enrollment document references
    IF TG_TABLE_NAME = 'enrollments' THEN
        DELETE FROM files
        WHERE bucket = 'enrollment-docs'
          AND path = OLD.storage_path;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply cleanup triggers (optional - use with caution)
-- CREATE TRIGGER cleanup_enrollment_files
--   AFTER DELETE ON enrollments
--   FOR EACH ROW EXECUTE FUNCTION cleanup_file_references();

-- =====================================================
-- STORAGE USAGE EXAMPLES
-- =====================================================

/*
Frontend File Upload Flow:

1. User selects file and submits form
2. Frontend uploads file to Supabase storage:
   const { data, error } = await supabase.storage
     .from('trial-documents')
     .upload('user-uploads/filename.pdf', file)

3. If successful, store reference in database:
   INSERT INTO enrollments (..., storage_path)
   VALUES (..., data.path)

4. To display file, generate signed URL:
   const { data: urlData } = await supabase.storage
     .from('trial-documents')
     .createSignedUrl(data.path, 3600)

File Organization in Buckets:

trial-documents/
├── consent-forms/
│   ├── patient-123-consent.pdf
│   └── patient-456-consent.pdf
└── study-data/
    ├── trial-a-data.xlsx
    └── trial-b-results.pdf

training-materials/
├── videos/
├── pdfs/
└── presentations/

Security Considerations:

- All buckets are PRIVATE
- Files only accessible via signed URLs
- RLS policies prevent unauthorized access
- Organization-based file isolation
- Audit trails for file operations

*/

-- =====================================================
-- STORAGE MONITORING QUERIES
-- =====================================================

-- Query: Get storage usage by organization
CREATE OR REPLACE FUNCTION get_organization_storage_usage(org_id UUID)
RETURNS TABLE (
    bucket TEXT,
    file_count BIGINT,
    total_size_bytes BIGINT,
    total_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.bucket,
        COUNT(*) as file_count,
        SUM(f.file_size) as total_size_bytes,
        ROUND(SUM(f.file_size)::numeric / 1024 / 1024, 2) as total_size_mb
    FROM files f
    WHERE f.organization_id = org_id
    GROUP BY f.bucket
    ORDER BY f.bucket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Query: Get recent file uploads
CREATE OR REPLACE FUNCTION get_recent_uploads(org_id UUID, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    file_name TEXT,
    bucket TEXT,
    uploaded_by_name TEXT,
    uploaded_at TIMESTAMPTZ,
    file_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.file_name,
        f.bucket,
        COALESCE(p.display_name, 'Unknown User') as uploaded_by_name,
        f.uploaded_at,
        ROUND(f.file_size::numeric / 1024 / 1024, 2) as file_size_mb
    FROM files f
    LEFT JOIN profiles p ON f.uploaded_by = p.id
    WHERE f.organization_id = org_id
      AND f.uploaded_at >= NOW() - INTERVAL '1 day' * days_back
    ORDER BY f.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Storage setup completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create the 5 private storage buckets in Supabase Dashboard';
    RAISE NOTICE '2. Test file upload functionality';
    RAISE NOTICE '3. Implement signed URL generation in your application';
    RAISE NOTICE '4. Test file access with different user roles';
END $$;
