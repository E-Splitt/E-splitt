-- Create Default Shared Group for E-Split
-- Run this SQL in your Supabase SQL Editor

-- Insert the default shared group that everyone will land on
INSERT INTO groups (group_id, data)
VALUES (
  'g_default001',
  '{
    "name": "Welcome Group",
    "participants": [],
    "expenses": [],
    "activityLog": [],
    "pinHash": null,
    "pinEnabled": false
  }'::jsonb
)
ON CONFLICT (group_id) DO NOTHING;

-- Verify it was created
SELECT * FROM groups WHERE group_id = 'g_default001';
