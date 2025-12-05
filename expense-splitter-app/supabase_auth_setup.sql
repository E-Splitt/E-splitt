-- =====================================================
-- E-Split Authentication Migration
-- Run ALL of this in Supabase SQL Editor
-- Project: https://zgykugrvbfteuzxyxoot.supabase.co
-- =====================================================

-- Add user_id column to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own groups" ON groups;
DROP POLICY IF EXISTS "Users can create their own groups" ON groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON groups;

-- Create RLS Policies for user-based access
CREATE POLICY "Users can view their own groups"
  ON groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups"
  ON groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups"
  ON groups FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-set user_id function
CREATE OR REPLACE FUNCTION set_user_id_on_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set user_id on insert
DROP TRIGGER IF EXISTS auto_set_user_id ON groups;
CREATE TRIGGER auto_set_user_id
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_group();

-- =====================================================
-- AFTER CREATING YOUR ADMIN USER, RUN THESE:
-- =====================================================
-- Get your user ID:
-- SELECT id FROM auth.users WHERE email = 'mdashwaq98@gmail.com';

-- Assign existing groups (replace YOUR_UUID):
-- UPDATE groups SET user_id = 'YOUR_UUID' WHERE user_id IS NULL;

-- Make user_id required:
-- ALTER TABLE groups ALTER COLUMN user_id SET NOT NULL;
-- =====================================================
