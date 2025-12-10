-- Migration to create daily_stock_snapshots table
-- Tracks opening and closing stock values and sales for each day and location

CREATE TABLE IF NOT EXISTS daily_stock_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL,
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  opening_stock_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  closing_stock_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  opening_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  closing_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, location_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_stock_snapshots_date ON daily_stock_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_stock_snapshots_location ON daily_stock_snapshots(location_id);
CREATE INDEX IF NOT EXISTS idx_daily_stock_snapshots_date_location ON daily_stock_snapshots(snapshot_date, location_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_daily_stock_snapshots_updated_at 
  BEFORE UPDATE ON daily_stock_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate stock value for a location at a given time
CREATE OR REPLACE FUNCTION calculate_stock_value(
  p_location_id UUID,
  p_snapshot_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  v_total_value DECIMAL(12, 2) := 0;
BEGIN
  SELECT COALESCE(SUM(sl.quantity * pv.cost), 0)
  INTO v_total_value
  FROM stock_levels sl
  INNER JOIN product_variants pv ON sl.variant_id = pv.id
  WHERE sl.location_id = p_location_id;
  
  RETURN v_total_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get opening sales for a date (first sale amount or 0)
CREATE OR REPLACE FUNCTION get_opening_sales(p_date DATE)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_opening_sales DECIMAL(10, 2) := 0;
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
BEGIN
  v_date_start := p_date::TIMESTAMPTZ;
  v_date_end := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  -- Get first sale of the day
  SELECT COALESCE(total_amount, 0)
  INTO v_opening_sales
  FROM sales
  WHERE created_at >= v_date_start 
    AND created_at < v_date_end
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN COALESCE(v_opening_sales, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get closing sales for a date (last sale amount or total sales)
CREATE OR REPLACE FUNCTION get_closing_sales(p_date DATE)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_closing_sales DECIMAL(10, 2) := 0;
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
BEGIN
  v_date_start := p_date::TIMESTAMPTZ;
  v_date_end := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  -- Get last sale of the day
  SELECT COALESCE(total_amount, 0)
  INTO v_closing_sales
  FROM sales
  WHERE created_at >= v_date_start 
    AND created_at < v_date_end
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_closing_sales, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get total sales for a date
CREATE OR REPLACE FUNCTION get_total_sales(p_date DATE)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_total_sales DECIMAL(10, 2) := 0;
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
BEGIN
  v_date_start := p_date::TIMESTAMPTZ;
  v_date_end := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_sales
  FROM sales
  WHERE created_at >= v_date_start 
    AND created_at < v_date_end;
  
  RETURN COALESCE(v_total_sales, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to create or update daily snapshot for a specific date and location
CREATE OR REPLACE FUNCTION create_daily_snapshot(
  p_date DATE,
  p_location_id UUID
)
RETURNS daily_stock_snapshots AS $$
DECLARE
  v_snapshot daily_stock_snapshots;
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
  v_opening_stock_value DECIMAL(12, 2);
  v_closing_stock_value DECIMAL(12, 2);
  v_opening_sales DECIMAL(10, 2);
  v_closing_sales DECIMAL(10, 2);
  v_total_sales DECIMAL(10, 2);
  v_previous_day_closing DECIMAL(12, 2);
BEGIN
  v_date_start := p_date::TIMESTAMPTZ;
  v_date_end := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  -- Try to get previous day's closing stock value
  SELECT closing_stock_value
  INTO v_previous_day_closing
  FROM daily_stock_snapshots
  WHERE snapshot_date = p_date - INTERVAL '1 day'
    AND location_id = p_location_id
  LIMIT 1;
  
  -- Calculate opening stock value
  -- Use previous day's closing if available, otherwise calculate current value
  IF v_previous_day_closing IS NOT NULL THEN
    v_opening_stock_value := v_previous_day_closing;
  ELSE
    -- For first day or if previous day doesn't exist, use current stock value
    v_opening_stock_value := calculate_stock_value(p_location_id, v_date_start);
  END IF;
  
  -- Calculate closing stock value (at end of day or current if today)
  IF p_date = CURRENT_DATE THEN
    -- For today, use current stock value
    v_closing_stock_value := calculate_stock_value(p_location_id, NOW());
  ELSE
    -- For past dates, we'd need historical data - for now use current calculation
    -- In a production system, you'd want to store historical stock levels
    v_closing_stock_value := calculate_stock_value(p_location_id, v_date_end);
  END IF;
  
  -- Get opening and closing sales
  v_opening_sales := get_opening_sales(p_date);
  v_closing_sales := get_closing_sales(p_date);
  v_total_sales := get_total_sales(p_date);
  
  -- Insert or update snapshot
  INSERT INTO daily_stock_snapshots (
    snapshot_date,
    location_id,
    opening_stock_value,
    closing_stock_value,
    opening_sales,
    closing_sales,
    total_sales
  )
  VALUES (
    p_date,
    p_location_id,
    v_opening_stock_value,
    v_closing_stock_value,
    v_opening_sales,
    v_closing_sales,
    v_total_sales
  )
  ON CONFLICT (snapshot_date, location_id)
  DO UPDATE SET
    opening_stock_value = EXCLUDED.opening_stock_value,
    closing_stock_value = EXCLUDED.closing_stock_value,
    opening_sales = EXCLUDED.opening_sales,
    closing_sales = EXCLUDED.closing_sales,
    total_sales = EXCLUDED.total_sales,
    updated_at = NOW()
  RETURNING * INTO v_snapshot;
  
  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Function to create snapshots for all locations for a specific date
CREATE OR REPLACE FUNCTION create_daily_snapshots_for_all_locations(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  location_id UUID,
  location_name TEXT,
  snapshot_id UUID
) AS $$
DECLARE
  v_location RECORD;
  v_snapshot daily_stock_snapshots;
BEGIN
  FOR v_location IN 
    SELECT id, name FROM inventory_locations ORDER BY name
  LOOP
    SELECT * INTO v_snapshot
    FROM create_daily_snapshot(p_date, v_location.id);
    
    location_id := v_location.id;
    location_name := v_location.name;
    snapshot_id := v_snapshot.id;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

