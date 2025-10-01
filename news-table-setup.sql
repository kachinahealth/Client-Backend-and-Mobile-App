-- Create news table with custom column names
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  news_title TEXT NOT NULL,
  news_content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
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
CREATE TRIGGER update_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (temporarily allow all for testing)
CREATE POLICY "Users can view all news" ON news
  FOR SELECT USING (true);

CREATE POLICY "Users can insert news" ON news
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update news" ON news
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete news" ON news
  FOR DELETE USING (true);

-- Insert sample news data
INSERT INTO news (news_title, news_content, created_by_name) VALUES
('Welcome to KachinaHealth Portal', 'We are excited to announce the launch of our new client management portal with enhanced features and improved user experience.', 'Admin'),
('System Maintenance Scheduled', 'Scheduled maintenance will occur this weekend from 2 AM to 4 AM EST. The system will be unavailable during this time.', 'Admin'),
('New Features Available', 'Check out the latest updates including improved analytics and enhanced reporting capabilities.', 'Admin')
ON CONFLICT DO NOTHING;
