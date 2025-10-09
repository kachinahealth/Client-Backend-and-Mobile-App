-- =====================================================
-- KachinaHealth Clinical Trials Platform - Schema Migration
-- =====================================================
-- This migration creates the complete database schema with:
-- - Organization-based multi-tenancy
-- - Role-based access control (Admin, User, Doctor)
-- - Clinical trial management
-- - Content management with proper scoping
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- DROP EXISTING TABLES (Safe cleanup)
-- =====================================================

-- Drop tables in reverse dependency order to avoid foreign key conflicts
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS study_protocols CASCADE;
DROP TABLE IF EXISTS training_materials CASCADE;
DROP TABLE IF EXISTS news_updates CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS user_clinical_assignments CASCADE;
DROP TABLE IF EXISTS clinical_trials CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations table
-- Purpose: Multi-tenant organization management
-- Each organization represents a separate tenant (e.g., Cerevasc, Medtronic)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table
-- Purpose: Application-level user profiles linked to Supabase Auth
-- Extends auth.users with organization and role information
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'doctor')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical trials table
-- Purpose: Clinical trial definitions scoped to organizations
-- Admins can create/manage trials within their organization
CREATE TABLE clinical_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User clinical assignments table
-- Purpose: Links users to specific clinical trials they can access
-- Users and doctors can only work on trials they're assigned to
CREATE TABLE user_clinical_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    clinical_trial_id UUID NOT NULL REFERENCES clinical_trials(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint prevents duplicate assignments
    UNIQUE(user_id, clinical_trial_id)
);

-- =====================================================
-- CONTENT TABLES
-- =====================================================

-- Enrollments table
-- Purpose: Track patient enrollments in clinical trials
-- Scoped to organization and specific clinical trial
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    clinical_trial_id UUID NOT NULL REFERENCES clinical_trials(id),
    participant_name TEXT NOT NULL,
    enrollment_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    notes TEXT,
    storage_path TEXT, -- Path to enrollment documents in storage bucket
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News updates table
-- Purpose: News and announcements for clinical trials
-- Scoped to organization and specific clinical trial
CREATE TABLE news_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    clinical_trial_id UUID NOT NULL REFERENCES clinical_trials(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    published_at TIMESTAMPTZ DEFAULT NOW(),
    storage_path TEXT, -- Path to news assets in storage bucket
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training materials table
-- Purpose: Training documents and resources for clinical trials
-- Scoped to organization and specific clinical trial
CREATE TABLE training_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    clinical_trial_id UUID NOT NULL REFERENCES clinical_trials(id),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    storage_path TEXT, -- Path to training materials in storage bucket
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study protocols table
-- Purpose: Study protocol documents for clinical trials
-- Scoped to organization and specific clinical trial
CREATE TABLE study_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    clinical_trial_id UUID NOT NULL REFERENCES clinical_trials(id),
    title TEXT NOT NULL,
    version TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    storage_path TEXT, -- Path to study protocols in storage bucket
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- OPTIONAL: FILES INDEX TABLE
-- =====================================================

-- Files table (optional central index)
-- Purpose: Central index for all uploaded files across the system
-- Helps track storage usage and provides a unified file management interface
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    clinical_trial_id UUID REFERENCES clinical_trials(id), -- Optional: some files might be org-wide
    bucket TEXT NOT NULL, -- Storage bucket name (e.g., 'trial-documents', 'training-materials')
    path TEXT NOT NULL, -- Storage path within the bucket
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Organization-based indexes (critical for RLS policies)
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_clinical_trials_organization_id ON clinical_trials(organization_id);
CREATE INDEX idx_user_clinical_assignments_organization_id ON user_clinical_assignments(organization_id);
CREATE INDEX idx_enrollments_organization_id ON enrollments(organization_id);
CREATE INDEX idx_news_updates_organization_id ON news_updates(organization_id);
CREATE INDEX idx_training_materials_organization_id ON training_materials(organization_id);
CREATE INDEX idx_study_protocols_organization_id ON study_protocols(organization_id);
CREATE INDEX idx_files_organization_id ON files(organization_id);

-- Clinical trial-based indexes
CREATE INDEX idx_user_clinical_assignments_clinical_trial_id ON user_clinical_assignments(clinical_trial_id);
CREATE INDEX idx_enrollments_clinical_trial_id ON enrollments(clinical_trial_id);
CREATE INDEX idx_news_updates_clinical_trial_id ON news_updates(clinical_trial_id);
CREATE INDEX idx_training_materials_clinical_trial_id ON training_materials(clinical_trial_id);
CREATE INDEX idx_study_protocols_clinical_trial_id ON study_protocols(clinical_trial_id);
CREATE INDEX idx_files_clinical_trial_id ON files(clinical_trial_id);

-- User-based indexes
CREATE INDEX idx_user_clinical_assignments_user_id ON user_clinical_assignments(user_id);
CREATE INDEX idx_enrollments_created_by ON enrollments(created_by);
CREATE INDEX idx_news_updates_created_by ON news_updates(created_by);
CREATE INDEX idx_training_materials_created_by ON training_materials(created_by);
CREATE INDEX idx_study_protocols_created_by ON study_protocols(created_by);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

-- Date-based indexes for common queries
CREATE INDEX idx_enrollments_enrollment_date ON enrollments(enrollment_date);
CREATE INDEX idx_news_updates_published_at ON news_updates(published_at);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add a comment to indicate successful migration
DO $$
BEGIN
    RAISE NOTICE 'Schema migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run the RLS policies migration';
    RAISE NOTICE '2. Run the seed data script';
    RAISE NOTICE '3. Create storage buckets';
END
$$;
