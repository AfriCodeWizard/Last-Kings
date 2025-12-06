-- Migration to remove tax features from the system
-- This makes tax fields default to 0 for backward compatibility
-- but removes the requirement for tax calculations

-- Update sales table to make tax fields default to 0
ALTER TABLE sales 
  ALTER COLUMN tax_amount SET DEFAULT 0,
  ALTER COLUMN excise_tax SET DEFAULT 0;

-- Update existing sales to set tax to 0 if not already set
UPDATE sales 
SET tax_amount = 0, excise_tax = 0 
WHERE tax_amount IS NULL OR excise_tax IS NULL;

-- Note: We keep the tax_rates table for now in case it's referenced elsewhere
-- But it's no longer used in the application code
-- If you want to completely remove it, you can drop it with:
-- DROP TABLE IF EXISTS tax_rates CASCADE;

