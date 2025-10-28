-- =====================================================
-- KachinaHealth Clinical Trials Platform - Helper Functions & Triggers
-- =====================================================
-- This migration creates helper functions and triggers to:
-- - Automate user creation and assignment
-- - Provide admin dropdown data
-- - Maintain data consistency
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS FOR USER MANAGEMENT
-- =====================================================

-- Function: Create profile and assign to clinical trial
-- Purpose: Used when admins/users create new users in the system
-- Automatically assigns new user to creator's organization and selected trial
DROP FUNCTION IF EXISTS create_profile_and_assignments(UUID, UUID, TEXT, UUID);
CREATE FUNCTION create_profile_and_assignments(
  admin_user_id UUID,           -- The admin/user creating the new account
  new_user_auth_id UUID,        -- The new user's auth.users ID
  new_user_role TEXT,          -- Role: 'admin', 'user', or 'doctor'
  selected_clinical_trial_id UUID DEFAULT NULL  -- Optional: assign to specific trial
)
RETURNS JSON AS $$
DECLARE
  admin_org_id UUID;
  admin_role TEXT;
  new_profile_id UUID;
  result JSON;
BEGIN
  -- Step 1: Verify admin permissions and get their organization
  SELECT organization_id, role INTO admin_org_id, admin_role
  FROM profiles
  WHERE id = admin_user_id;

  -- Check if admin exists and has permission to create users
  IF admin_org_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin user not found'
    );
  END IF;

  IF admin_role NOT IN ('admin', 'user') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins and users can create new accounts'
    );
  END IF;

  -- Step 2: Validate the new user role
  IF new_user_role NOT IN ('admin', 'user', 'doctor') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role. Must be: admin, user, or doctor'
    );
  END IF;

  -- Step 3: Insert the new profile with the admin's organization
  INSERT INTO profiles (
    id,
    organization_id,
    role,
    display_name
  )
  VALUES (
    new_user_auth_id,
    admin_org_id,
    new_user_role,
    COALESCE(
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = new_user_auth_id),
      (SELECT email FROM auth.users WHERE id = new_user_auth_id),
      'New User'
    )
  )
  RETURNING id INTO new_profile_id;

  -- Step 4: If clinical trial specified, assign user to it
  IF selected_clinical_trial_id IS NOT NULL THEN
    -- Verify the trial belongs to the admin's organization
    IF NOT EXISTS (
      SELECT 1 FROM clinical_trials
      WHERE id = selected_clinical_trial_id
      AND organization_id = admin_org_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Selected clinical trial does not belong to your organization'
      );
    END IF;

    -- Create the assignment
    INSERT INTO user_clinical_assignments (
      user_id,
      clinical_trial_id,
      organization_id
    )
    VALUES (
      new_user_auth_id,
      selected_clinical_trial_id,
      admin_org_id
    );
  END IF;

  -- Step 5: Return success
  RETURN json_build_object(
    'success', true,
    'profile_id', new_profile_id,
    'organization_id', admin_org_id,
    'trial_assigned', (selected_clinical_trial_id IS NOT NULL)
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: List clinical trials for admin dropdown
-- Purpose: Returns all clinical trials in an admin's organization for dropdown selection
-- Used in User Management interface when creating new users
DROP FUNCTION IF EXISTS list_clinical_trials_for_admin(UUID);
CREATE FUNCTION list_clinical_trials_for_admin(admin_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  participant_count BIGINT
) AS $$
BEGIN
  -- Verify user is an admin and get their organization
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = admin_user_id
    AND role = 'admin'
  ) THEN
    RETURN; -- Return empty result set for non-admins
  END IF;

  -- Return all clinical trials for the admin's organization
  RETURN QUERY
  SELECT
    ct.id,
    ct.name,
    ct.description,
    ct.is_active,
    ct.created_at,
    COALESCE(ec.count, 0) as participant_count
  FROM clinical_trials ct
  LEFT JOIN (
    SELECT clinical_trial_id, COUNT(*) as count
    FROM enrollments
    GROUP BY clinical_trial_id
  ) ec ON ec.clinical_trial_id = ct.id
  WHERE ct.organization_id = (
    SELECT organization_id FROM profiles WHERE id = admin_user_id
  )
  ORDER BY ct.is_active DESC, ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADDITIONAL HELPER FUNCTIONS
-- =====================================================

-- Function: Get user's accessible clinical trials
-- Purpose: Returns all clinical trials a user can access (for navigation/filtering)
DROP FUNCTION IF EXISTS get_user_accessible_trials(UUID);
CREATE FUNCTION get_user_accessible_trials(user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  organization_name TEXT
) AS $$
DECLARE
  user_role TEXT;
  user_org_id UUID;
BEGIN
  -- Get user's role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM profiles WHERE id = user_id;

  -- Return different results based on role
  IF user_role = 'admin' THEN
    -- Admins see all trials in their organization
    RETURN QUERY
    SELECT ct.id, ct.name, o.name as organization_name
    FROM clinical_trials ct
    JOIN organizations o ON ct.organization_id = o.id
    WHERE ct.organization_id = user_org_id
    ORDER BY ct.is_active DESC, ct.name;
  ELSE
    -- Users and doctors see only assigned trials
    RETURN QUERY
    SELECT ct.id, ct.name, o.name as organization_name
    FROM clinical_trials ct
    JOIN user_clinical_assignments uca ON ct.id = uca.clinical_trial_id
    JOIN organizations o ON ct.organization_id = o.id
    WHERE uca.user_id = user_id
    ORDER BY ct.is_active DESC, ct.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get organization statistics for dashboard
-- Purpose: Returns summary stats for an organization's dashboard
DROP FUNCTION IF EXISTS get_organization_stats(UUID);
CREATE FUNCTION get_organization_stats(org_id UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles WHERE organization_id = org_id),
    'total_trials', (SELECT COUNT(*) FROM clinical_trials WHERE organization_id = org_id),
    'active_trials', (SELECT COUNT(*) FROM clinical_trials WHERE organization_id = org_id AND is_active = true),
    'total_enrollments', (SELECT COUNT(*) FROM enrollments WHERE organization_id = org_id),
    'recent_news', (SELECT COUNT(*) FROM news_updates WHERE organization_id = org_id AND published_at >= NOW() - INTERVAL '30 days'),
    'total_materials', (SELECT COUNT(*) FROM training_materials WHERE organization_id = org_id)
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- =====================================================

-- Trigger: Automatically set organization_id on user_clinical_assignments
-- Purpose: Ensures organization_id matches the trial's organization
DROP FUNCTION IF EXISTS set_assignment_organization_id();
CREATE FUNCTION set_assignment_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the organization_id from the clinical trial
  SELECT organization_id INTO NEW.organization_id
  FROM clinical_trials
  WHERE id = NEW.clinical_trial_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_clinical_assignments
CREATE TRIGGER trigger_set_assignment_org_id
  BEFORE INSERT OR UPDATE ON user_clinical_assignments
  FOR EACH ROW EXECUTE FUNCTION set_assignment_organization_id();

-- Trigger: Update updated_at timestamp on content tables
-- Purpose: Automatically maintain updated_at timestamps
DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to content tables
CREATE TRIGGER trigger_update_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_news_updated_at
  BEFORE UPDATE ON news_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_materials_updated_at
  BEFORE UPDATE ON training_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_protocols_updated_at
  BEFORE UPDATE ON study_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Prevent cross-organization content creation
-- Purpose: Extra safety check to ensure content belongs to correct org
DROP FUNCTION IF EXISTS validate_content_organization();
CREATE FUNCTION validate_content_organization()
RETURNS TRIGGER AS $$
DECLARE
  trial_org_id UUID;
BEGIN
  -- Get organization_id from the clinical trial
  SELECT organization_id INTO trial_org_id
  FROM clinical_trials
  WHERE id = NEW.clinical_trial_id;

  -- Ensure they match
  IF trial_org_id != NEW.organization_id THEN
    RAISE EXCEPTION 'Content organization_id (%) does not match trial organization_id (%)',
      NEW.organization_id, trial_org_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all content tables
CREATE TRIGGER trigger_validate_enrollments_org
  BEFORE INSERT OR UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION validate_content_organization();

CREATE TRIGGER trigger_validate_news_org
  BEFORE INSERT OR UPDATE ON news_updates
  FOR EACH ROW EXECUTE FUNCTION validate_content_organization();

CREATE TRIGGER trigger_validate_materials_org
  BEFORE INSERT OR UPDATE ON training_materials
  FOR EACH ROW EXECUTE FUNCTION validate_content_organization();

CREATE TRIGGER trigger_validate_protocols_org
  BEFORE INSERT OR UPDATE ON study_protocols
  FOR EACH ROW EXECUTE FUNCTION validate_content_organization();

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
Example usage of helper functions:

1. Create a new user as admin:
   SELECT create_profile_and_assignments(
     'admin-uuid'::uuid,
     'new-user-uuid'::uuid,
     'user',
     'trial-uuid'::uuid
   );

2. Get clinical trials for admin dropdown:
   SELECT * FROM list_clinical_trials_for_admin('admin-uuid'::uuid);

3. Get user's accessible trials:
   SELECT * FROM get_user_accessible_trials('user-uuid'::uuid);

4. Get organization statistics:
   SELECT get_organization_stats('org-uuid'::uuid);

Triggers automatically:
- Set organization_id on assignments
- Update timestamps on content changes
- Validate organization consistency
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Helper Functions & Triggers migration completed successfully!';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '- create_profile_and_assignments(admin_id, user_id, role, trial_id)';
    RAISE NOTICE '- list_clinical_trials_for_admin(admin_id)';
    RAISE NOTICE '- get_user_accessible_trials(user_id)';
    RAISE NOTICE '- get_organization_stats(org_id)';
    RAISE NOTICE 'Triggers: Auto-organization assignment, timestamps, and validation';
END
$$;
