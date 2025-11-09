-- =====================================================
-- KachinaHealth Clinical Trials Platform - RLS Policies Migration
-- =====================================================
-- This migration creates Row Level Security policies to enforce:
-- - Organization-based multi-tenancy
-- - Role-based access control (Admin, User, Doctor)
-- - Clinical trial assignment restrictions
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =====================================================

-- Function to get user's organization ID
DROP FUNCTION IF EXISTS get_user_organization_id();
CREATE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role
DROP FUNCTION IF EXISTS get_user_role();
CREATE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is assigned to a clinical trial
DROP FUNCTION IF EXISTS is_user_assigned_to_trial(UUID);
CREATE FUNCTION is_user_assigned_to_trial(trial_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_clinical_assignments
    WHERE user_id = auth.uid()
    AND clinical_trial_id = trial_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

-- Core tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clinical_assignments ENABLE ROW LEVEL SECURITY;

-- Content tables
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATIONS TABLE POLICIES
-- =====================================================

-- Organizations: Users can only see their own organization
-- All roles: SELECT only their organization
CREATE POLICY "organizations_select_policy" ON organizations
FOR SELECT USING (id = get_user_organization_id());

-- Organizations: Only admins can modify organizations (though this is rarely needed)
CREATE POLICY "organizations_admin_policy" ON organizations
FOR ALL USING (
  get_user_role() = 'admin' AND
  id = get_user_organization_id()
);

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Profiles: Users can only see profiles in their organization
-- All roles: SELECT profiles in their organization
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (organization_id = get_user_organization_id());

-- Profiles: Admins and Users can create new profiles in their organization
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  (get_user_role() IN ('admin', 'user')) AND
  organization_id = get_user_organization_id()
);

-- Profiles: Users can update their own profile, Admins can update any profile in their org
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (
  (id = auth.uid()) OR
  (get_user_role() = 'admin' AND organization_id = get_user_organization_id())
) WITH CHECK (
  (id = auth.uid()) OR
  (get_user_role() = 'admin' AND organization_id = get_user_organization_id())
);

-- Profiles: Only admins can delete profiles in their organization
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
);

-- =====================================================
-- CLINICAL TRIALS TABLE POLICIES
-- =====================================================

-- Clinical Trials: All users can see trials in their organization
-- All roles: SELECT trials in their organization
CREATE POLICY "clinical_trials_select_policy" ON clinical_trials
FOR SELECT USING (organization_id = get_user_organization_id());

-- Clinical Trials: Only admins can create trials in their organization
CREATE POLICY "clinical_trials_insert_policy" ON clinical_trials
FOR INSERT WITH CHECK (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
);

-- Clinical Trials: Only admins can update trials in their organization
CREATE POLICY "clinical_trials_update_policy" ON clinical_trials
FOR UPDATE USING (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
) WITH CHECK (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
);

-- Clinical Trials: Only admins can delete trials in their organization
CREATE POLICY "clinical_trials_delete_policy" ON clinical_trials
FOR DELETE USING (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
);

-- =====================================================
-- USER CLINICAL ASSIGNMENTS TABLE POLICIES
-- =====================================================

-- User Clinical Assignments: Users can see assignments in their organization
-- All roles: SELECT assignments in their organization
CREATE POLICY "user_clinical_assignments_select_policy" ON user_clinical_assignments
FOR SELECT USING (organization_id = get_user_organization_id());

-- User Clinical Assignments: Admins can manage all assignments in their org
-- Users can create assignments (when creating users, handled by helper functions)
CREATE POLICY "user_clinical_assignments_insert_policy" ON user_clinical_assignments
FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'user') AND
  organization_id = get_user_organization_id()
);

-- User Clinical Assignments: Admins can update assignments in their org
CREATE POLICY "user_clinical_assignments_update_policy" ON user_clinical_assignments
FOR UPDATE USING (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
) WITH CHECK (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
);

-- User Clinical Assignments: Admins can delete assignments in their org
CREATE POLICY "user_clinical_assignments_delete_policy" ON user_clinical_assignments
FOR DELETE USING (
  get_user_role() = 'admin' AND
  organization_id = get_user_organization_id()
);

-- =====================================================
-- CONTENT TABLES POLICIES
-- =====================================================

-- =====================================================
-- ENROLLMENTS TABLE POLICIES
-- =====================================================

-- Enrollments: Users can see enrollments in trials they're assigned to
-- Admin: SELECT all enrollments in their organization
-- User: SELECT enrollments in assigned trials
-- Doctor: SELECT enrollments in assigned trials
CREATE POLICY "enrollments_select_policy" ON enrollments
FOR SELECT USING (
  organization_id = get_user_organization_id() AND
  (
    get_user_role() = 'admin' OR
    is_user_assigned_to_trial(clinical_trial_id)
  )
);

-- Enrollments: Admin/User can create enrollments in assigned trials
CREATE POLICY "enrollments_insert_policy" ON enrollments
FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- Enrollments: Admin/User can update enrollments in assigned trials
CREATE POLICY "enrollments_update_policy" ON enrollments
FOR UPDATE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
) WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- Enrollments: Admin/User can delete enrollments in assigned trials
CREATE POLICY "enrollments_delete_policy" ON enrollments
FOR DELETE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- =====================================================
-- HOSPITALS TABLE POLICIES
-- =====================================================

-- Hospitals: Users can see hospitals in their organization
CREATE POLICY "hospitals_select_policy" ON hospitals
FOR SELECT USING (organization_id = get_user_organization_id());

-- Hospitals: Admins can create hospitals in their organization
CREATE POLICY "hospitals_insert_policy" ON hospitals
FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() = 'admin'
);

-- Hospitals: Admins can update hospitals in their organization
CREATE POLICY "hospitals_update_policy" ON hospitals
FOR UPDATE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() = 'admin'
) WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() = 'admin'
);

-- Hospitals: Admins can delete hospitals in their organization
CREATE POLICY "hospitals_delete_policy" ON hospitals
FOR DELETE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() = 'admin'
);

-- =====================================================
-- NEWS UPDATES TABLE POLICIES
-- =====================================================

-- News Updates: Allow anyone to read news items (no auth required for public access)
CREATE POLICY "news_updates_select_policy" ON news_updates
FOR SELECT USING (true);

-- News Updates: Admin/User can create news in assigned trials
CREATE POLICY "news_updates_insert_policy" ON news_updates
FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- News Updates: Admin/User can update news in assigned trials
CREATE POLICY "news_updates_update_policy" ON news_updates
FOR UPDATE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
) WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- News Updates: Admin/User can delete news in assigned trials
CREATE POLICY "news_updates_delete_policy" ON news_updates
FOR DELETE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- =====================================================
-- TRAINING MATERIALS TABLE POLICIES
-- =====================================================

-- Training Materials: Users can see materials in trials they're assigned to
-- Admin: SELECT all materials in their organization
-- User: SELECT materials in assigned trials
-- Doctor: SELECT materials in assigned trials
CREATE POLICY "training_materials_select_policy" ON training_materials
FOR SELECT USING (
  organization_id = get_user_organization_id() AND
  (
    get_user_role() = 'admin' OR
    is_user_assigned_to_trial(clinical_trial_id)
  )
);

-- Training Materials: Admin/User can create materials in assigned trials
CREATE POLICY "training_materials_insert_policy" ON training_materials
FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- Training Materials: Admin/User can update materials in assigned trials
CREATE POLICY "training_materials_update_policy" ON training_materials
FOR UPDATE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
) WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- Training Materials: Admin/User can delete materials in assigned trials
CREATE POLICY "training_materials_delete_policy" ON training_materials
FOR DELETE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- =====================================================
-- STUDY PROTOCOLS TABLE POLICIES
-- =====================================================

-- Study Protocols: Users can see protocols in trials they're assigned to
-- Admin: SELECT all protocols in their organization
-- User: SELECT protocols in assigned trials
-- Doctor: SELECT protocols in assigned trials
CREATE POLICY "study_protocols_select_policy" ON study_protocols
FOR SELECT USING (
  organization_id = get_user_organization_id() AND
  (
    get_user_role() = 'admin' OR
    is_user_assigned_to_trial(clinical_trial_id)
  )
);

-- Study Protocols: Admin/User can create protocols in assigned trials
CREATE POLICY "study_protocols_insert_policy" ON study_protocols
FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- Study Protocols: Admin/User can update protocols in assigned trials
CREATE POLICY "study_protocols_update_policy" ON study_protocols
FOR UPDATE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
) WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- Study Protocols: Admin/User can delete protocols in assigned trials
CREATE POLICY "study_protocols_delete_policy" ON study_protocols
FOR DELETE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user') AND
  (get_user_role() = 'admin' OR is_user_assigned_to_trial(clinical_trial_id))
);

-- =====================================================
-- FILES TABLE POLICIES
-- =====================================================

-- Files: Users can see files in their organization
-- All roles: SELECT files in their organization
CREATE POLICY "files_select_policy" ON files
FOR SELECT USING (organization_id = get_user_organization_id());

-- Files: Admin/User can upload files to their organization
CREATE POLICY "files_insert_policy" ON files
FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user')
);

-- Files: Admin/User can update files in their organization
CREATE POLICY "files_update_policy" ON files
FOR UPDATE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user')
) WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user')
);

-- Files: Admin/User can delete files in their organization
CREATE POLICY "files_delete_policy" ON files
FOR DELETE USING (
  organization_id = get_user_organization_id() AND
  get_user_role() IN ('admin', 'user')
);

-- Note: Helper functions for user management (create_profile_and_assignments, list_clinical_trials_for_admin)
-- are defined in helper-functions-triggers.sql with enhanced features and proper error handling

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'RLS Policies migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test RLS policies with different user roles';
    RAISE NOTICE '2. Run the seed data script';
    RAISE NOTICE '3. Create storage buckets';
END
$$;
