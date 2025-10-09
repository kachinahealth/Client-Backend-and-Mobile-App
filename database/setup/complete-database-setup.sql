-- KachinaHealth Client Portal Database Setup
-- Run this complete script in your Supabase SQL editor
-- This creates all tables, policies, triggers, and sample data

-- ==================================================
-- EXTENSIONS
-- ==================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- HELPER FUNCTIONS
-- ==================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==================================================
-- LEGACY TABLES (for backward compatibility)
-- ==================================================

-- Clients table (legacy)
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for clients
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Users can view all clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert clients" ON clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update clients" ON clients
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==================================================
-- CORE APPLICATION TABLES
-- ==================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  site TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert users" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update users" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete users" ON users
  FOR DELETE USING (auth.role() = 'authenticated');

-- News items table
CREATE TABLE IF NOT EXISTS news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for news_items
CREATE TRIGGER update_news_items_updated_at
    BEFORE UPDATE ON news_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for news_items
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for news_items
CREATE POLICY "Users can view all news items" ON news_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert news items" ON news_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update news items" ON news_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete news items" ON news_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  consented INTEGER DEFAULT 0,
  randomized INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for hospitals
CREATE TRIGGER update_hospitals_updated_at
    BEFORE UPDATE ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for hospitals
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- RLS policies for hospitals
CREATE POLICY "Users can view all hospitals" ON hospitals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert hospitals" ON hospitals
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update hospitals" ON hospitals
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete hospitals" ON hospitals
  FOR DELETE USING (auth.role() = 'authenticated');

-- Training Materials table
CREATE TABLE IF NOT EXISTS training_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'pdf', 'video')),
  content TEXT, -- For text content or file URL/path
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for training_materials
CREATE TRIGGER update_training_materials_updated_at
    BEFORE UPDATE ON training_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for training_materials
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_materials
CREATE POLICY "Users can view all training materials" ON training_materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert training materials" ON training_materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update training materials" ON training_materials
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete training materials" ON training_materials
  FOR DELETE USING (auth.role() = 'authenticated');

-- Study Protocols table
CREATE TABLE IF NOT EXISTS study_protocols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'pdf')),
  content TEXT, -- For text content or file URL/path
  version TEXT DEFAULT '1.0',
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for study_protocols
CREATE TRIGGER update_study_protocols_updated_at
    BEFORE UPDATE ON study_protocols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for study_protocols
ALTER TABLE study_protocols ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_protocols
CREATE POLICY "Users can view all study protocols" ON study_protocols
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert study protocols" ON study_protocols
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update study protocols" ON study_protocols
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete study protocols" ON study_protocols
  FOR DELETE USING (auth.role() = 'authenticated');

-- Clinical Trials table
CREATE TABLE IF NOT EXISTS clinical_trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trial_name TEXT NOT NULL,
  sponsor TEXT,
  phase TEXT CHECK (phase IN ('Phase 1', 'Phase 2', 'Phase 3', 'Phase 4')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Terminated', 'Recruiting', 'Suspended')),
  start_date DATE,
  end_date DATE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for clinical_trials
CREATE TRIGGER update_clinical_trials_updated_at
    BEFORE UPDATE ON clinical_trials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for clinical_trials
ALTER TABLE clinical_trials ENABLE ROW LEVEL SECURITY;

-- RLS policies for clinical_trials
CREATE POLICY "Users can view all clinical trials" ON clinical_trials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert clinical trials" ON clinical_trials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update clinical trials" ON clinical_trials
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete clinical trials" ON clinical_trials
  FOR DELETE USING (auth.role() = 'authenticated');

-- PDF Documents table
CREATE TABLE IF NOT EXISTS pdf_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for pdf_documents
CREATE TRIGGER update_pdf_documents_updated_at
    BEFORE UPDATE ON pdf_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for pdf_documents
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for pdf_documents
CREATE POLICY "Users can view all PDF documents" ON pdf_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert PDF documents" ON pdf_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update PDF documents" ON pdf_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete PDF documents" ON pdf_documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- User Analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_analytics
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_analytics
CREATE POLICY "Users can view their own analytics" ON user_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON user_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- App Settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger for app_settings
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings
CREATE POLICY "Users can view all app settings" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify app settings" ON app_settings
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ==================================================
-- SAMPLE DATA INSERTION
-- ==================================================

-- Insert sample users
INSERT INTO users (name, email, role, site, created_by_name) VALUES
('Admin User', 'admin@kachinahealth.com', 'admin', 'Corporate', 'System'),
('John Smith', 'john.smith@hospital1.com', 'manager', 'Hospital 1', 'Admin User'),
('Sarah Johnson', 'sarah.johnson@hospital2.com', 'user', 'Hospital 2', 'Admin User'),
('Mike Davis', 'mike.davis@hospital3.com', 'user', 'Hospital 3', 'Admin User'),
('Lisa Brown', 'lisa.brown@hospital4.com', 'manager', 'Hospital 4', 'Admin User'),
('David Wilson', 'david.wilson@clinic1.com', 'user', 'Clinic 1', 'Admin User'),
('Jennifer Garcia', 'jennifer.garcia@clinic2.com', 'user', 'Clinic 2', 'Admin User');

-- Insert sample hospitals
INSERT INTO hospitals (name, location, consented, randomized) VALUES
('Metropolitan General Hospital', 'New York, NY', 125, 95),
('City Medical Center', 'Los Angeles, CA', 98, 87),
('Regional Health System', 'Chicago, IL', 156, 123),
('Community Hospital', 'Houston, TX', 87, 76);

-- Insert sample news items
INSERT INTO news_items (title, content, category, created_by_name) VALUES
('Welcome to KachinaHealth Portal', 'Welcome to the new KachinaHealth client portal! This platform provides comprehensive access to clinical trial data, training materials, and study protocols.', 'Announcement', 'Admin User'),
('New Training Module Available', 'We have added a new training module on GCP compliance. Please review the materials in the Training Materials section.', 'Training', 'Admin User'),
('System Maintenance Notice', 'Scheduled maintenance will occur this weekend from 2 AM to 4 AM EST. The system may be temporarily unavailable.', 'Maintenance', 'Admin User');

-- Insert sample training materials
INSERT INTO training_materials (title, description, type, content, category, created_by_name) VALUES
('Introduction to Clinical Trials', 'Basic overview of clinical trial processes and terminology', 'text', 'Clinical trials are research studies that test new medical treatments, drugs, or devices in humans. They follow strict protocols and ethical guidelines to ensure safety and efficacy.', 'General', 'Admin User'),
('GCP Training Module', 'Good Clinical Practice guidelines and compliance', 'pdf', '/files/gcp-training.pdf', 'Compliance', 'Admin User'),
('Patient Recruitment Best Practices', 'Strategies for effective patient recruitment in clinical trials', 'text', 'Effective patient recruitment involves clear communication, building trust with healthcare providers, and utilizing multiple outreach channels.', 'Procedure Training', 'Admin User'),
('Data Management Overview', 'Introduction to clinical data management systems', 'video', '/videos/data-management.mp4', 'Safety Training', 'Admin User');

-- Insert sample study protocols
INSERT INTO study_protocols (title, description, type, content, version, created_by_name) VALUES
('Phase III Cardiac Study Protocol', 'Complete protocol for the Phase III cardiac intervention study', 'pdf', '/protocols/cardiac-study-v2.pdf', '2.1', 'Admin User'),
('Patient Recruitment Guidelines', 'Guidelines for patient recruitment and enrollment procedures', 'text', 'This protocol outlines the procedures for identifying, screening, and enrolling eligible patients into the clinical trial.', '1.0', 'Admin User'),
('Data Collection Standards', 'Standards and procedures for data collection and management', 'pdf', '/protocols/data-standards-v3.pdf', '3.0', 'Admin User'),
('Safety Monitoring Protocol', 'Adverse event reporting and safety monitoring procedures', 'text', 'All adverse events must be reported within 24 hours. This protocol details the reporting procedures and escalation paths.', '2.0', 'Admin User');

-- Insert sample clinical trials
INSERT INTO clinical_trials (trial_name, sponsor, phase, status, start_date, end_date, description) VALUES
('CARDIAC-001: Minimally Invasive Cardiac Intervention', 'KachinaHealth', 'Phase 3', 'Recruiting', '2024-01-15', '2026-12-31', 'Phase III clinical trial evaluating minimally invasive cardiac intervention procedures'),
('NEURO-002: Neurological Assessment Study', 'KachinaHealth', 'Phase 2', 'Active', '2023-09-01', '2025-08-31', 'Phase II study assessing neurological outcomes following intervention'),
('VASCULAR-003: Vascular Access Optimization', 'KachinaHealth', 'Phase 2', 'Recruiting', '2024-03-01', '2026-02-28', 'Phase II trial optimizing vascular access techniques'),
('PEDIATRIC-004: Pediatric Intervention Study', 'KachinaHealth', 'Phase 1', 'Active', '2023-11-01', '2025-10-31', 'Phase I safety study for pediatric applications'),
('LONG-TERM-005: Five-Year Follow-up Study', 'KachinaHealth', 'Phase 4', 'Active', '2022-01-01', '2027-12-31', 'Long-term follow-up study tracking patient outcomes over 5 years'),
('QUALITY-006: Quality of Life Assessment', 'KachinaHealth', 'Phase 3', 'Completed', '2021-06-01', '2024-05-31', 'Quality of life assessment following intervention procedures'),
('COST-007: Cost-Effectiveness Analysis', 'KachinaHealth', 'Phase 4', 'Recruiting', '2024-02-01', '2027-01-31', 'Cost-effectiveness analysis of intervention procedures'),
('INTERNATIONAL-008: Multi-Center Global Study', 'KachinaHealth', 'Phase 3', 'Active', '2023-07-01', '2026-06-30', 'Multi-center international study across 15 countries');

-- Insert sample app settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('site_name', '"KachinaHealth Client Portal"', 'Name of the application'),
('version', '"1.0.0"', 'Current application version'),
('maintenance_mode', 'false', 'Whether the application is in maintenance mode'),
('max_file_size', '52428800', 'Maximum file upload size in bytes (50MB)'),
('allowed_file_types', '["pdf", "mp4", "avi", "mov", "doc", "docx"]', 'Allowed file types for uploads'),
('session_timeout', '3600000', 'Session timeout in milliseconds (1 hour)');

-- ==================================================
-- COMPLETION MESSAGE
-- ==================================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'KachinaHealth Database Setup Complete!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '- users (% rows)', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '- news_items (% rows)', (SELECT COUNT(*) FROM news_items);
    RAISE NOTICE '- hospitals (% rows)', (SELECT COUNT(*) FROM hospitals);
    RAISE NOTICE '- training_materials (% rows)', (SELECT COUNT(*) FROM training_materials);
    RAISE NOTICE '- study_protocols (% rows)', (SELECT COUNT(*) FROM study_protocols);
    RAISE NOTICE '- clinical_trials (% rows)', (SELECT COUNT(*) FROM clinical_trials);
    RAISE NOTICE '- pdf_documents (% rows)', (SELECT COUNT(*) FROM pdf_documents);
    RAISE NOTICE '- app_settings (% rows)', (SELECT COUNT(*) FROM app_settings);
    RAISE NOTICE '';
    RAISE NOTICE 'All tables have Row Level Security enabled.';
    RAISE NOTICE 'Sample data has been inserted for testing.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Configure authentication in Supabase Dashboard';
    RAISE NOTICE '2. Test the application with admin@kachinahealth.com';
    RAISE NOTICE '3. Review and adjust RLS policies as needed';
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
END $$;
