-- Update payment_method enum to include mpesa and remove card/split
-- First, alter the enum type to add mpesa
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mpesa';

-- Update existing records: convert 'card' and 'split' to 'cash' (or handle as needed)
UPDATE sales 
SET payment_method = 'cash' 
WHERE payment_method IN ('card', 'split');

-- Note: We cannot directly remove enum values in PostgreSQL
-- The old values ('card', 'split') will remain in the enum type but won't be used
-- If you need to completely remove them, you would need to:
-- 1. Create a new enum type
-- 2. Alter the column to use the new type
-- 3. Drop the old enum type
-- This is more complex and may not be necessary if we just don't use those values

