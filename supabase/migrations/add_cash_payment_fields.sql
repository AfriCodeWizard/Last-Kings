-- Migration to add cash payment tracking fields
-- Add received_amount and change_given to sales table

ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS change_given DECIMAL(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN sales.received_amount IS 'Amount received from customer (for cash payments)';
COMMENT ON COLUMN sales.change_given IS 'Change given back to customer (for cash payments)';

