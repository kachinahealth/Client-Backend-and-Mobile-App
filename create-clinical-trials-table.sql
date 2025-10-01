-- =================================================
-- CREATE CLINICAL TRIALS TABLE FOR KACHINAHEALTH PORTAL
-- Run this entire script in your Supabase SQL editor
-- =================================================

-- Create clinical_trials table for clinical trial management
CREATE TABLE IF NOT EXISTS clinical_trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trial_name TEXT NOT NULL,
  description TEXT,
  company_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  start_date DATE,
  end_date DATE,
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
CREATE TRIGGER update_clinical_trials_updated_at
    BEFORE UPDATE ON clinical_trials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE clinical_trials ENABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view all clinical trials" ON clinical_trials;
DROP POLICY IF EXISTS "Users can insert clinical trials" ON clinical_trials;
DROP POLICY IF EXISTS "Users can update clinical trials" ON clinical_trials;
DROP POLICY IF EXISTS "Users can delete clinical trials" ON clinical_trials;

-- Create permissive policies for testing (allows all operations)
-- NOTE: In production, you should restrict these to authenticated users only
CREATE POLICY "Users can view all clinical trials" ON clinical_trials FOR SELECT USING (true);
CREATE POLICY "Users can insert clinical trials" ON clinical_trials FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update clinical trials" ON clinical_trials FOR UPDATE USING (true);
CREATE POLICY "Users can delete clinical trials" ON clinical_trials FOR DELETE USING (true);

-- Insert sample clinical trials data
INSERT INTO clinical_trials (trial_name, description, company_name, status, start_date, end_date) VALUES
('CEREBRAL Trial - Phase 3', 'A randomized controlled trial evaluating the safety and efficacy of cerebral protection during transcatheter aortic valve replacement in patients at high risk for stroke.', 'Cerevasc Inc.', 'active', '2024-01-15', '2026-12-31'),
('Medtronic TAVR Study', 'Multi-center registry study evaluating long-term outcomes of transcatheter aortic valve replacement using Medtronic valves.', 'Medtronic', 'active', '2023-06-01', '2027-05-31'),
('Cardiovascular Outcomes Study', 'Prospective observational study examining cardiovascular outcomes in high-risk surgical patients undergoing non-cardiac procedures.', 'Various Partners', 'active', '2024-03-01', '2028-02-28'),
('Neuroprotection Trial', 'Phase 2 clinical trial investigating neuroprotective strategies during cardiac surgery to reduce postoperative cognitive dysfunction.', 'Cerevasc Inc.', 'paused', '2023-09-01', '2025-08-31'),
('Valve Replacement Registry', 'National registry capturing real-world data on transcatheter and surgical valve replacement procedures and outcomes.', 'Medtronic', 'active', '2022-01-01', '2030-12-31'),
('Stroke Prevention Study', 'Randomized trial comparing different cerebral protection devices during carotid artery stenting procedures.', 'Cerevasc Inc.', 'completed', '2020-05-01', '2024-04-30'),
('Minimally Invasive Surgery Trial', 'Comparative effectiveness study of minimally invasive versus traditional surgical approaches for valve repair.', 'Various Partners', 'active', '2024-07-01', '2029-06-30')
ON CONFLICT DO NOTHING;
