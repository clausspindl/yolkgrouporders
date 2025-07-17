-- Migration: Add company_profiles table
-- Run this in Supabase SQL Editor

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_address TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Company profiles policies
CREATE POLICY "Users can view their own company profile" ON company_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profile" ON company_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile" ON company_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for company_profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE company_profiles;

-- Create trigger function (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for company_profiles updated_at
CREATE TRIGGER update_company_profiles_updated_at 
  BEFORE UPDATE ON company_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 