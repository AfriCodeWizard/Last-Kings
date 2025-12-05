-- Migration: Make product name nullable
-- Run this in Supabase SQL Editor

-- Make the name column nullable
ALTER TABLE products 
ALTER COLUMN name DROP NOT NULL;

-- Add a comment
COMMENT ON COLUMN products.name IS 'Product name (optional, can be null)';

