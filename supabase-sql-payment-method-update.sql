-- =====================================================
-- Update Payment Method Enum: Add M-Pesa, Remove Card/Split
-- =====================================================
-- Run this script in Supabase SQL Editor
-- This will:
-- 1. Add 'mpesa' to the payment_method enum
-- 2. Update existing sales records with 'card' or 'split' to 'cash'
-- =====================================================

-- Step 1: Add 'mpesa' to the payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mpesa';

-- Step 2: Update existing sales records
-- Convert 'card' and 'split' payments to 'cash'
UPDATE sales 
SET payment_method = 'cash' 
WHERE payment_method IN ('card', 'split');

-- Step 3: Verify the changes
-- You can run this query to check the results:
-- SELECT payment_method, COUNT(*) 
-- FROM sales 
-- GROUP BY payment_method;

-- Note: PostgreSQL does not allow removing enum values once they are created.
-- The 'card' and 'split' values will remain in the enum type definition
-- but will no longer be used. This is safe and won't cause any issues.

