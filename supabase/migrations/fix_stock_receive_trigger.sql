-- Fix stock receive trigger to handle NULL lot_numbers correctly
-- The issue is that ON CONFLICT with NULL lot_number might not match correctly
-- We need to use COALESCE or handle NULLs explicitly

CREATE OR REPLACE FUNCTION update_stock_on_receive()
RETURNS TRIGGER AS $$
DECLARE
    existing_stock_id UUID;
    existing_quantity INTEGER;
BEGIN
    -- Try to find existing stock with matching variant, location, and lot_number
    -- Handle NULL lot_number case explicitly
    SELECT id, quantity INTO existing_stock_id, existing_quantity
    FROM stock_levels
    WHERE variant_id = NEW.variant_id
      AND location_id = NEW.location_id
      AND (
        (lot_number IS NULL AND NEW.lot_number IS NULL) OR
        (lot_number = NEW.lot_number)
      )
    LIMIT 1;

    IF existing_stock_id IS NOT NULL THEN
        -- Update existing stock
        UPDATE stock_levels
        SET quantity = quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = existing_stock_id;
    ELSE
        -- Insert new stock entry
        INSERT INTO stock_levels (variant_id, location_id, quantity, lot_number, expiry_date)
        VALUES (NEW.variant_id, NEW.location_id, NEW.quantity, NEW.lot_number, NEW.expiry_date);
    END IF;
    
    -- Create inventory transaction record
    INSERT INTO inventory_transactions (
        variant_id, location_id, transaction_type, quantity_change, lot_number, reference_id, created_by
    )
    VALUES (
        NEW.variant_id, 
        NEW.location_id, 
        'receiving', 
        NEW.quantity, 
        NEW.lot_number, 
        NEW.session_id,
        (SELECT received_by FROM receiving_sessions WHERE id = NEW.session_id)
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the insert
        RAISE WARNING 'Error in update_stock_on_receive trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ language 'plpgsql';

