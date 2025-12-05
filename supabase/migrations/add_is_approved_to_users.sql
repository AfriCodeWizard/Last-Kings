-- Migration: Add is_approved column to users table
-- Run this in Supabase SQL Editor

-- Add the is_approved column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing users: set admin users to approved, others to pending
UPDATE users 
SET is_approved = TRUE 
WHERE role = 'admin';

-- Add a comment to the column
COMMENT ON COLUMN users.is_approved IS 'Whether the user has been approved by an admin. Admin users are auto-approved.';

