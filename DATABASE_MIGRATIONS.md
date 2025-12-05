# Database Migrations Required

You need to run the following migrations in your Supabase SQL Editor in order:

## Migration 1: Add Product Type

**File:** `supabase/migrations/add_product_type_to_products.sql`

This migration:
- Creates the `product_type` enum with values: 'liquor', 'beverage'
- Adds the `product_type` column to the `products` table
- Sets default value to 'liquor' for existing products

**Run this first:**
```sql
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
```

## Migration 2: Make Product Name Nullable

**File:** `supabase/migrations/make_product_name_nullable.sql`

This migration:
- Makes the `name` column nullable (removes NOT NULL constraint)
- Allows products to exist without a name (since we're using brand name instead)

**Run this second:**
```sql
-- Migration: Make product name nullable
-- Run this in Supabase SQL Editor

-- Make the name column nullable
ALTER TABLE products 
ALTER COLUMN name DROP NOT NULL;

-- Add a comment
COMMENT ON COLUMN products.name IS 'Product name (optional, can be null)';
```

## Summary

After running both migrations, your `products` table will have:
- ✅ `product_type` column (enum: 'liquor' or 'beverage') - **REQUIRED**
- ✅ `name` column - **OPTIONAL** (nullable)

## Notes

- Existing products will default to `product_type = 'liquor'`
- Existing products will keep their current `name` values (they won't be deleted)
- New products can be created without a `name` (it will be NULL)
- All new products must have a `product_type` selected

