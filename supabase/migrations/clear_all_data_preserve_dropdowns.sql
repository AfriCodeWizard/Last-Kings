-- Clear All System Data Migration
-- This migration clears all business data while preserving:
-- - Brands (for dropdown)
-- - Categories (for dropdown)
-- - Inventory locations (for dropdown)
-- - Users (system accounts) - IMPORTANT: Users are NEVER deleted
-- - Distributors (for dropdown - optional, but keeping for now)
-- 
-- WARNING: This will delete all sales, inventory, products, purchase orders, tabs, and customers
-- NOTE: The users table is NOT included in any DELETE statements - all user accounts are preserved

-- Disable triggers temporarily to avoid constraint issues during bulk deletes
SET session_replication_role = 'replica';

-- Clear all tabs data (must be before sales due to foreign key)
DELETE FROM tabs;

-- Clear all sales data
DELETE FROM sale_items;
DELETE FROM sales;

-- Clear all inventory transactions and stock levels
DELETE FROM inventory_transactions;
DELETE FROM stock_levels;

-- Clear all receiving data
DELETE FROM received_items;
DELETE FROM receiving_sessions;

-- Clear all purchase order data
DELETE FROM po_items;
DELETE FROM purchase_orders;

-- Clear all customer and allocation data
DELETE FROM allocations;
DELETE FROM customers;

-- Clear all product variants and products (but keep brands and categories)
DELETE FROM product_variants;
DELETE FROM products;

-- Clear distributors (optional - uncomment if you want to clear these too)
-- DELETE FROM distributors;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Note: The following are preserved:
-- - brands (for dropdown)
-- - categories (for dropdown)
-- - inventory_locations (for dropdown - Main Floor, Backroom, Warehouse)
-- - users (system accounts) - NEVER deleted, all accounts remain intact
-- - distributors (for dropdown - uncomment DELETE above if you want to clear these)

