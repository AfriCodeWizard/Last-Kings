-- Migration to create tabs table for customer tabs
-- Tabs allow customers to accumulate purchases and pay later

CREATE TABLE IF NOT EXISTS tabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  phone TEXT,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Add tab_id to sales table to link sales to tabs
ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS tab_id UUID REFERENCES tabs(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tabs_status ON tabs(status);
CREATE INDEX IF NOT EXISTS idx_tabs_created_by ON tabs(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_tab ON sales(tab_id);

-- Add trigger for updated_at
CREATE TRIGGER update_tabs_updated_at BEFORE UPDATE ON tabs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update tab total when sale is added
CREATE OR REPLACE FUNCTION update_tab_total()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tab_id IS NOT NULL THEN
        UPDATE tabs
        SET total_amount = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM sales
            WHERE tab_id = NEW.tab_id
        ),
        updated_at = NOW()
        WHERE id = NEW.tab_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_tab_total
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_tab_total();

-- Function to update tab total when sale is deleted
CREATE OR REPLACE FUNCTION update_tab_total_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tab_id IS NOT NULL THEN
        UPDATE tabs
        SET total_amount = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM sales
            WHERE tab_id = OLD.tab_id
        ),
        updated_at = NOW()
        WHERE id = OLD.tab_id;
    END IF;
    RETURN OLD;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_tab_total_on_delete
    AFTER DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_tab_total_on_delete();

