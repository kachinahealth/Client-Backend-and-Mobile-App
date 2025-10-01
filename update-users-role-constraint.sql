-- Update the users table role constraint to change 'viewer' to 'doctor'
-- Run this in your Supabase SQL editor

-- First, drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with 'doctor' instead of 'viewer'
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'user', 'doctor'));

-- Update any existing 'viewer' roles to 'doctor'
UPDATE users SET role = 'doctor' WHERE role = 'viewer';

-- Verify the change
SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;
