-- Client Portal Database Setup for Supabase
-- Run these commands in your Supabase SQL editor

-- Create clients table
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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Allow users to view all clients (you might want to restrict this based on user roles)
CREATE POLICY "Users can view all clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to insert clients
CREATE POLICY "Users can insert clients" ON clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update clients
CREATE POLICY "Users can update clients" ON clients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow users to delete clients
CREATE POLICY "Users can delete clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated');

-- Optional: Create a view for easier client management
CREATE VIEW client_summary AS
SELECT
  id,
  name,
  email,
  company,
  phone,
  status,
  created_at,
  updated_at,
  EXTRACT(DAY FROM NOW() - created_at) as days_since_creation
FROM clients
ORDER BY created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON client_summary TO authenticated;

-- ============================================================================
-- DASHBOARD TABS DATABASE SCHEMA
-- ============================================================================

-- Users table for User Management tab
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  site TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'doctor')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'approved', 'revoked')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News & Updates table
CREATE TABLE IF NOT EXISTS news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollment Leaderboard table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_name TEXT NOT NULL,
  location TEXT NOT NULL,
  principal_investigator TEXT NOT NULL,
  consented_patients INTEGER DEFAULT 0,
  randomized_patients INTEGER DEFAULT 0,
  consented_rate DECIMAL(5,2) DEFAULT 0.00,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- PDF Documents table (for News & Updates PDFs)
CREATE TABLE IF NOT EXISTS pdf_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_url TEXT, -- Supabase Storage URL
  file_name TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_email TEXT,
  site TEXT,
  total_app_opens INTEGER DEFAULT 0,
  last_app_open TIMESTAMP WITH TIME ZONE,
  tab_views JSONB DEFAULT '{}', -- Store tab view counts as JSON
  most_viewed_tab TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- ============================================================================

-- Users table trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- News items trigger
CREATE TRIGGER update_news_items_updated_at
    BEFORE UPDATE ON news_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Hospitals trigger
CREATE TRIGGER update_hospitals_updated_at
    BEFORE UPDATE ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Training materials trigger
CREATE TRIGGER update_training_materials_updated_at
    BEFORE UPDATE ON training_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Study protocols trigger
CREATE TRIGGER update_study_protocols_updated_at
    BEFORE UPDATE ON study_protocols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- PDF documents trigger
CREATE TRIGGER update_pdf_documents_updated_at
    BEFORE UPDATE ON pdf_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Analytics trigger
CREATE TRIGGER update_user_analytics_updated_at
    BEFORE UPDATE ON user_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Settings trigger
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete users" ON users FOR DELETE USING (auth.role() = 'authenticated');

-- News items policies
CREATE POLICY "Users can view news items" ON news_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert news items" ON news_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update news items" ON news_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete news items" ON news_items FOR DELETE USING (auth.role() = 'authenticated');

-- Hospitals policies
CREATE POLICY "Users can view hospitals" ON hospitals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert hospitals" ON hospitals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update hospitals" ON hospitals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete hospitals" ON hospitals FOR DELETE USING (auth.role() = 'authenticated');

-- Training materials policies
CREATE POLICY "Users can view training materials" ON training_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert training materials" ON training_materials FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update training materials" ON training_materials FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete training materials" ON training_materials FOR DELETE USING (auth.role() = 'authenticated');

-- Study protocols policies
CREATE POLICY "Users can view study protocols" ON study_protocols FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert study protocols" ON study_protocols FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update study protocols" ON study_protocols FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete study protocols" ON study_protocols FOR DELETE USING (auth.role() = 'authenticated');

-- PDF documents policies
CREATE POLICY "Users can view pdf documents" ON pdf_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert pdf documents" ON pdf_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update pdf documents" ON pdf_documents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete pdf documents" ON pdf_documents FOR DELETE USING (auth.role() = 'authenticated');

-- Analytics policies
CREATE POLICY "Users can view analytics" ON user_analytics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert analytics" ON user_analytics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update analytics" ON user_analytics FOR UPDATE USING (auth.role() = 'authenticated');

-- Settings policies (admin only for updates)
CREATE POLICY "Users can view settings" ON app_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert settings" ON app_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update settings" ON app_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'KachinaHealth', 'string', 'Company name displayed in dashboard'),
('company_logo_url', '/logos/logo.png', 'string', 'URL to company logo'),
('default_user_role', 'user', 'string', 'Default role for new users'),
('enable_analytics', 'true', 'boolean', 'Enable user analytics tracking')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample users
INSERT INTO users (name, email, site, role, status) VALUES
('Admin User', 'admin@kachinahealth.com', 'Main Office', 'admin', 'active'),
('Dr. John Smith', 'john.smith@hospital1.com', 'Hospital 1', 'user', 'active'),
('Dr. Jane Doe', 'jane.doe@hospital2.com', 'Hospital 2', 'user', 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert sample news
INSERT INTO news_items (title, content, created_by_name) VALUES
('Welcome to the New Dashboard', 'We are excited to announce the launch of our new client management portal with enhanced features and improved user experience.', 'Admin'),
('System Maintenance Notice', 'Scheduled maintenance will occur this weekend from 2 AM to 4 AM EST. The system will be unavailable during this time.', 'Admin')
ON CONFLICT DO NOTHING;

-- Insert sample hospitals
INSERT INTO hospitals (hospital_name, location, principal_investigator, consented_patients, randomized_patients, consented_rate) VALUES
('City General Hospital', 'New York, NY', 'Dr. Michael Johnson', 150, 120, 80.00),
('Metro Medical Center', 'Los Angeles, CA', 'Dr. Sarah Williams', 200, 180, 90.00),
('Regional Health System', 'Chicago, IL', 'Dr. Robert Brown', 125, 100, 80.00)
ON CONFLICT DO NOTHING;
