-- =================================================
-- CREATE USERS TABLE FOR KACHINAHEALTH PORTAL
-- Run this entire script in your Supabase SQL editor
-- =================================================

-- Create users table for user management
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  site TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'doctor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'approved', 'revoked')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can update users" ON users;
DROP POLICY IF EXISTS "Users can delete users" ON users;

-- Create permissive policies for testing (allows all operations)
-- NOTE: In production, you should restrict these to authenticated users only
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can delete users" ON users FOR DELETE USING (true);

-- Insert sample users for testing
INSERT INTO users (name, email, site, role, status) VALUES
('Admin User', 'admin@kachinahealth.com', 'Main Office', 'admin', 'active'),
('Dr. John Smith', 'john.smith@hospital1.com', 'City General Hospital', 'user', 'active'),
('Dr. Sarah Williams', 'sarah.williams@hospital2.com', 'Metro Medical Center', 'user', 'active'),
('Dr. Robert Brown', 'robert.brown@hospital3.com', 'Regional Health System', 'user', 'pending')
ON CONFLICT (email) DO NOTHING;

-- =================================================
-- VERIFICATION: Check if table was created successfully
-- =================================================

-- You can run these queries separately to verify:
-- SELECT * FROM users;
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';
