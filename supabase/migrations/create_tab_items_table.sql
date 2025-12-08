-- Migration to create tab_items table for storing pending items
-- Items are stored here until tab is cashed out, then converted to sales

CREATE TABLE IF NOT EXISTS tab_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tab_id UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tab_items_tab_id ON tab_items(tab_id);
CREATE INDEX IF NOT EXISTS idx_tab_items_variant_id ON tab_items(variant_id);

-- Function to update tab total from tab_items
CREATE OR REPLACE FUNCTION update_tab_total_from_items()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tabs
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM tab_items
        WHERE tab_id = COALESCE(NEW.tab_id, OLD.tab_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.tab_id, OLD.tab_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to update tab total when tab_items are added/updated/deleted
CREATE TRIGGER trigger_update_tab_total_from_items
    AFTER INSERT OR UPDATE OR DELETE ON tab_items
    FOR EACH ROW EXECUTE FUNCTION update_tab_total_from_items();

