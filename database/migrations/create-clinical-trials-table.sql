-- Migration: Add Clinical Trials Table
-- Date: 2025-10-02
-- Description: Adds the clinical_trials table for managing clinical trial data

-- Create Clinical Trials table
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

-- Insert sample clinical trials data
INSERT INTO clinical_trials (trial_name, sponsor, phase, status, start_date, end_date, description) VALUES
('CARDIAC-001: Minimally Invasive Cardiac Intervention', 'KachinaHealth', 'Phase 3', 'Recruiting', '2024-01-15', '2026-12-31', 'Phase III clinical trial evaluating minimally invasive cardiac intervention procedures'),
('NEURO-002: Neurological Assessment Study', 'KachinaHealth', 'Phase 2', 'Active', '2023-09-01', '2025-08-31', 'Phase II study assessing neurological outcomes following intervention'),
('VASCULAR-003: Vascular Access Optimization', 'KachinaHealth', 'Phase 2', 'Recruiting', '2024-03-01', '2026-02-28', 'Phase II trial optimizing vascular access techniques'),
('PEDIATRIC-004: Pediatric Intervention Study', 'KachinaHealth', 'Phase 1', 'Active', '2023-11-01', '2025-10-31', 'Phase I safety study for pediatric applications'),
('LONG-TERM-005: Five-Year Follow-up Study', 'KachinaHealth', 'Phase 4', 'Active', '2022-01-01', '2027-12-31', 'Long-term follow-up study tracking patient outcomes over 5 years'),
('QUALITY-006: Quality of Life Assessment', 'KachinaHealth', 'Phase 3', 'Completed', '2021-06-01', '2024-05-31', 'Quality of life assessment following intervention procedures'),
('COST-007: Cost-Effectiveness Analysis', 'KachinaHealth', 'Phase 4', 'Recruiting', '2024-02-01', '2027-01-31', 'Cost-effectiveness analysis of intervention procedures'),
('INTERNATIONAL-008: Multi-Center Global Study', 'KachinaHealth', 'Phase 3', 'Active', '2023-07-01', '2026-06-30', 'Multi-center international study across 15 countries');

-- Verification query
SELECT 'Clinical Trials table created successfully with ' || COUNT(*) || ' sample records' as result
FROM clinical_trials;
