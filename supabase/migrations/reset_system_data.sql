-- Reset System Data Migration
-- This migration clears all business data while preserving users and system structure
-- WARNING: This will delete all sales, inventory, products, distributors, and purchase orders

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = 'replica';

-- Clear all sales data
DELETE FROM sale_items;
DELETE FROM sales;

-- Clear all inventory data
DELETE FROM stock_levels;
DELETE FROM inventory_transactions;

-- Clear all receiving data
DELETE FROM received_items;
DELETE FROM receiving_sessions;

-- Clear all purchase order data
DELETE FROM po_items;
DELETE FROM purchase_orders;

-- Clear all distributors
DELETE FROM distributors;

-- Clear all product data (variants must be deleted before products due to foreign keys)
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM brands;
DELETE FROM categories;

-- Clear all customer data
DELETE FROM allocations;
DELETE FROM customers;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Note: Users and inventory_locations are preserved
-- Users table is kept intact
-- Inventory locations (Main Floor, Backroom, Warehouse) are preserved for system functionality

