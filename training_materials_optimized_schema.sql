-- Optimized Training Materials Schema
-- This schema supports text content, file uploads (PDF, video, etc.), and proper categorization

CREATE TABLE training_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    clinical_trial_id UUID NOT NULL REFERENCES clinical_trials(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('text', 'pdf', 'video', 'document')),
    content TEXT, -- For text content OR file path/URL for uploaded files
    category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('General', 'Safety Training', 'Procedure Training', 'Compliance', 'Clinical Procedures', 'Regulatory', 'Quality Assurance')),
    file_name TEXT, -- Original filename for uploaded files
    file_size BIGINT, -- File size in bytes
    mime_type TEXT, -- MIME type (e.g., 'application/pdf', 'video/mp4')
    storage_path TEXT, -- Full storage path in Supabase Storage
    storage_bucket TEXT DEFAULT 'training-materials', -- Storage bucket name
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_by_name TEXT, -- Cached creator name for performance
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    version TEXT DEFAULT '1.0',
    tags TEXT[], -- Array of tags for better organization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_training_materials_organization ON training_materials(organization_id);
CREATE INDEX idx_training_materials_trial ON training_materials(clinical_trial_id);
CREATE INDEX idx_training_materials_type ON training_materials(type);
CREATE INDEX idx_training_materials_category ON training_materials(category);
CREATE INDEX idx_training_materials_active ON training_materials(is_active) WHERE is_active = true;
CREATE INDEX idx_training_materials_created_by ON training_materials(created_by);

-- Updated_at trigger
CREATE TRIGGER update_training_materials_updated_at
    BEFORE UPDATE ON training_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view training materials from their organization" ON training_materials
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert training materials for their organization" ON training_materials
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own training materials" ON training_materials
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can manage all training materials in their organization" ON training_materials
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE training_materials IS 'Training materials for clinical trials including text content and file uploads';
COMMENT ON COLUMN training_materials.type IS 'Content type: text, pdf, video, or document';
COMMENT ON COLUMN training_materials.content IS 'Text content for text type, or file identifier/path for file types';
COMMENT ON COLUMN training_materials.storage_path IS 'Full path in Supabase Storage bucket';
COMMENT ON COLUMN training_materials.category IS 'Training category for organization';

-- Sample data for testing
INSERT INTO training_materials (
    organization_id,
    clinical_trial_id,
    title,
    description,
    type,
    content,
    category,
    created_by,
    created_by_name
) VALUES (
    (SELECT id FROM organizations LIMIT 1),
    (SELECT id FROM clinical_trials LIMIT 1),
    'Sample Training Document',
    'This is a sample training document for testing purposes.',
    'text',
    'This is the full text content of the training document. It can contain detailed instructions, procedures, and guidelines for clinical trial staff.',
    'General',
    (SELECT id FROM profiles LIMIT 1),
    'System Administrator'
);
