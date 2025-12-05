-- Migration: Add product_type to products table
-- Run this in Supabase SQL Editor

-- Create the product_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('liquor', 'beverage');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the product_type column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type product_type NOT NULL DEFAULT 'liquor';

-- Add a comment to the column
COMMENT ON COLUMN products.product_type IS 'Type of product: liquor or beverage';

