-- =====================================================
-- Clear All Sales and Reports Data
-- =====================================================
-- Run this script in Supabase SQL Editor
-- This will delete all sales, sale items, and related data
-- Everything will start from zero after this
-- =====================================================

-- WARNING: This will permanently delete all sales data!
-- Make sure you have a backup if needed before running this.

-- Step 1: Delete all sale items (must be deleted first due to foreign key)
DELETE FROM sale_items;

-- Step 2: Delete all sales
DELETE FROM sales;

-- Step 3: Delete inventory transactions related to sales
DELETE FROM inventory_transactions WHERE transaction_type = 'sale';

-- Step 4: Reset customer total_spent to zero (since it's calculated from sales)
UPDATE customers SET total_spent = 0;

-- Step 5: Verify the deletion
-- You can run these queries to verify:
-- SELECT COUNT(*) FROM sales; -- Should return 0
-- SELECT COUNT(*) FROM sale_items; -- Should return 0
-- SELECT COUNT(*) FROM inventory_transactions WHERE transaction_type = 'sale'; -- Should return 0
-- SELECT SUM(total_spent) FROM customers; -- Should return 0

-- Note: This will clear:
-- - All sales transactions
-- - All sale items
-- - All inventory transactions related to sales
-- - Customer total_spent values (reset to 0)
-- - All sales reports will show zero after this
-- - Dashboard sales metrics will reset to zero
-- - Reports page will show no sales data
-- - Sales history will be completely cleared

-- The following data will NOT be affected:
-- - Products
-- - Product variants
-- - Customers
-- - Purchase orders
-- - Receiving sessions
-- - Stock levels
-- - Inventory locations
-- - Users
-- - Settings

