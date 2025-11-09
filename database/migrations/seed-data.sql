-- =====================================================
-- KachinaHealth Clinical Trials Platform - Seed Data
-- =====================================================
-- This script populates the database with test data:
-- - Organizations (Cerevasc, Medtronic)
-- - User profiles for ALL existing auth.users
-- - Clinical trials
-- - User assignments to trials
-- - Sample content for testing RLS policies
-- =====================================================

-- =====================================================
-- ORGANIZATIONS
-- =====================================================

INSERT INTO organizations (name) VALUES
('Cerevasc'),
('Medtronic')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- USER PROFILES FOR ALL EXISTING AUTH USERS
-- =====================================================
-- This creates profiles for ALL auth users, assigning them to organizations
-- based on email patterns or randomly for demo purposes

DO $$
DECLARE
    cerevasc_org_id UUID;
    medtronic_org_id UUID;
    user_record RECORD;
    assigned_org_id UUID;
    assigned_role TEXT;
    assigned_display_name TEXT;
BEGIN
    -- Get organization IDs
    SELECT id INTO cerevasc_org_id FROM organizations WHERE name = 'Cerevasc';
    SELECT id INTO medtronic_org_id FROM organizations WHERE name = 'Medtronic';

    -- Process each auth user
    FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        -- Skip if profile already exists
        IF EXISTS (SELECT 1 FROM profiles WHERE id = user_record.id) THEN
            CONTINUE;
        END IF;

        -- Determine organization based on email patterns
        IF user_record.email LIKE '%cerevasc%' THEN
            assigned_org_id := cerevasc_org_id;
        ELSIF user_record.email LIKE '%medtronic%' THEN
            assigned_org_id := medtronic_org_id;
        ELSE
            -- For other emails, assign randomly for demo
            assigned_org_id := CASE WHEN random() < 0.5 THEN cerevasc_org_id ELSE medtronic_org_id END;
        END IF;

        -- Determine role based on email patterns
        IF user_record.email LIKE 'admin@%' THEN
            assigned_role := 'admin';
        ELSIF user_record.email LIKE 'doctor@%' THEN
            assigned_role := 'doctor';
        ELSE
            assigned_role := 'user';
        END IF;

        -- Get display name from metadata or email
        assigned_display_name := COALESCE(
            user_record.raw_user_meta_data->>'full_name',
            user_record.raw_user_meta_data->>'name',
            split_part(user_record.email, '@', 1)
        );

        -- Create profile
        INSERT INTO profiles (id, organization_id, role, display_name)
        VALUES (user_record.id, assigned_org_id, assigned_role, assigned_display_name);

        RAISE NOTICE 'Created profile for %: % (%) in %',
            user_record.email, assigned_display_name, assigned_role,
            CASE WHEN assigned_org_id = cerevasc_org_id THEN 'Cerevasc' ELSE 'Medtronic' END;
    END LOOP;

    RAISE NOTICE 'All auth users now have profiles';
END $$;

-- =====================================================
-- CLINICAL TRIALS
-- =====================================================

-- Create clinical trials for each organization
INSERT INTO clinical_trials (organization_id, name, description, is_active, created_by)
SELECT
    o.id,
    o.name || ' Trial A',
    'Phase II clinical trial for ' || o.name || ' medical device evaluating efficacy in cardiovascular procedures',
    true,
    (SELECT id FROM profiles WHERE organization_id = o.id AND role = 'admin' LIMIT 1)
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO clinical_trials (organization_id, name, description, is_active, created_by)
SELECT
    o.id,
    o.name || ' Trial B',
    'Phase III clinical trial for ' || o.name || ' medical device with expanded patient cohort',
    true,
    (SELECT id FROM profiles WHERE organization_id = o.id AND role = 'admin' LIMIT 1)
FROM organizations o
ON CONFLICT DO NOTHING;

-- =====================================================
-- USER CLINICAL ASSIGNMENTS
-- =====================================================

-- Assign users to trials in their organization
-- For each organization, assign non-admin users to Trial A
INSERT INTO user_clinical_assignments (user_id, clinical_trial_id, organization_id)
SELECT
    p.id,
    ct.id,
    p.organization_id
FROM profiles p
JOIN clinical_trials ct ON ct.organization_id = p.organization_id
WHERE p.role IN ('user', 'doctor')
AND ct.name LIKE '%Trial A'
ON CONFLICT (user_id, clinical_trial_id) DO NOTHING;

-- =====================================================
-- SAMPLE CONTENT FOR TRIAL A
-- =====================================================

-- Create sample content for all Trial A instances
DO $$
DECLARE
    trial_record RECORD;
BEGIN
    -- Process each Trial A
    FOR trial_record IN SELECT id, organization_id, name FROM clinical_trials WHERE name LIKE '%Trial A' LOOP

        -- =====================================================
        -- ENROLLMENTS
        -- =====================================================
        INSERT INTO enrollments (
            organization_id,
            clinical_trial_id,
            participant_name,
            enrollment_date,
            created_by,
            notes,
            storage_path
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            'John Smith',
            '2024-01-15'::date,
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1),
            'Initial enrollment for Phase II trial. Patient shows good baseline metrics.',
            'enrollment-docs/john-smith-consent.pdf'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO enrollments (
            organization_id,
            clinical_trial_id,
            participant_name,
            enrollment_date,
            created_by,
            notes
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            'Sarah Johnson',
            '2024-02-01'::date,
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1),
            'Second participant enrolled. Pre-procedure assessment completed.'
        ) ON CONFLICT DO NOTHING;

        -- =====================================================
        -- NEWS UPDATES
        -- =====================================================
        INSERT INTO news_updates (
            organization_id,
            clinical_trial_id,
            title,
            body,
            created_by,
            published_at,
            storage_path
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            trial_record.name || ' Milestone: First 50 Patients Enrolled',
            'We are pleased to announce that ' || trial_record.name || ' has successfully enrolled its first 50 patients. This represents a significant milestone in our clinical research program. The trial continues to show promising results with our innovative cardiovascular device technology.

Key achievements:
• 50 patients enrolled across 5 clinical sites
• Zero device-related serious adverse events
• 98% procedural success rate
• Strong investigator and patient satisfaction scores

We remain committed to advancing cardiovascular care through rigorous clinical research.',
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1),
            NOW(),
            'news-assets/' || lower(replace(trial_record.name, ' ', '-')) || '-milestone-image.jpg'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO news_updates (
            organization_id,
            clinical_trial_id,
            title,
            body,
            created_by,
            published_at
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            'Updated Protocol Version 2.1 Now Available',
            'Trial investigators should note that Protocol Version 2.1 has been approved and is now available for ' || trial_record.name || '. Key updates include:

• Revised inclusion criteria for better patient selection
• Enhanced monitoring procedures for safety endpoints
• Updated statistical analysis plan
• New training requirements for study coordinators

All sites must complete the updated training module within 30 days. Please contact the study coordinator if you need assistance.',
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1),
            NOW() - INTERVAL '10 days'
        ) ON CONFLICT DO NOTHING;

        -- =====================================================
        -- TRAINING MATERIALS
        -- =====================================================
        INSERT INTO training_materials (
            organization_id,
            clinical_trial_id,
            title,
            description,
            created_by,
            storage_path
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            'Device Implantation Training Module',
            'Comprehensive training module for physicians performing device implantation for ' || trial_record.name || '. Covers device preparation, implantation technique, troubleshooting, and post-procedure care.

Duration: 45 minutes
Includes: Video demonstrations, step-by-step guides, and interactive quizzes
Certification: Required for all trial investigators',
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1),
            'training-materials/device-implantation-training-v2.pdf'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO training_materials (
            organization_id,
            clinical_trial_id,
            title,
            description,
            created_by
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            'Data Entry and CRF Completion',
            'Training on proper case report form completion and data entry procedures for ' || trial_record.name || '. Includes data validation rules, common errors to avoid, and query resolution processes.

Duration: 30 minutes
Audience: Study coordinators and clinical research associates',
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1)
        ) ON CONFLICT DO NOTHING;

        -- =====================================================
        -- STUDY PROTOCOLS
        -- =====================================================
        INSERT INTO study_protocols (
            organization_id,
            clinical_trial_id,
            title,
            version,
            created_by,
            storage_path
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            trial_record.name || ' Study Protocol',
            '2.1',
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1),
            'study-protocols/' || lower(replace(trial_record.name, ' ', '-')) || '-protocol-v2.1.pdf'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO study_protocols (
            organization_id,
            clinical_trial_id,
            title,
            version,
            created_by
        ) VALUES (
            trial_record.organization_id,
            trial_record.id,
            'Statistical Analysis Plan',
            '1.0',
            (SELECT id FROM profiles WHERE organization_id = trial_record.organization_id AND role = 'admin' LIMIT 1)
        ) ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample content seeded for %', trial_record.name;
    END LOOP;

    RAISE NOTICE 'All Trial A content seeded successfully';
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Display seeded data summary
DO $$
DECLARE
    org_count INTEGER;
    profile_count INTEGER;
    trial_count INTEGER;
    assignment_count INTEGER;
    enrollment_count INTEGER;
    news_count INTEGER;
    material_count INTEGER;
    protocol_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO trial_count FROM clinical_trials;
    SELECT COUNT(*) INTO assignment_count FROM user_clinical_assignments;
    SELECT COUNT(*) INTO enrollment_count FROM enrollments;
    SELECT COUNT(*) INTO news_count FROM news_updates;
    SELECT COUNT(*) INTO material_count FROM training_materials;
    SELECT COUNT(*) INTO protocol_count FROM study_protocols;

    RAISE NOTICE '=== SEED DATA SUMMARY ===';
    RAISE NOTICE 'Organizations: %', org_count;
    RAISE NOTICE 'User Profiles: %', profile_count;
    RAISE NOTICE 'Clinical Trials: %', trial_count;
    RAISE NOTICE 'User Assignments: %', assignment_count;
    RAISE NOTICE 'Enrollments: %', enrollment_count;
    RAISE NOTICE 'News Updates: %', news_count;
    RAISE NOTICE 'Training Materials: %', material_count;
    RAISE NOTICE 'Study Protocols: %', protocol_count;
    RAISE NOTICE '========================';
    RAISE NOTICE 'Seed data insertion completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test RLS policies with different user roles';
    RAISE NOTICE '2. Create storage buckets';
    RAISE NOTICE '3. Test helper functions';
END $$;
