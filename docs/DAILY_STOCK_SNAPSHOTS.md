# Daily Stock Snapshots Feature

## Overview

The Daily Stock Snapshots feature tracks opening and closing stock values and sales for all inventory locations on a daily basis. **Sales data (opening sales, closing sales, total sales) is available to all users**, while **stock values are admin-only** to protect sensitive cost information.

## Features

- **Opening Stock Value**: Stock value at the beginning of each day (calculated from previous day's closing or current stock)
- **Closing Stock Value**: Stock value at the end of each day
- **Opening Sales**: First sale amount of the day
- **Closing Sales**: Last sale amount of the day
- **Total Sales**: Total sales amount for the day
- **Stock Change**: Difference between closing and opening stock values with percentage change

## Database Schema

The feature uses the `daily_stock_snapshots` table which stores:
- `snapshot_date`: Date of the snapshot
- `location_id`: Inventory location
- `opening_stock_value`: Stock value at start of day
- `closing_stock_value`: Stock value at end of day
- `opening_sales`: First sale amount
- `closing_sales`: Last sale amount
- `total_sales`: Total sales for the day

## Setup

### 1. Run Database Migration

Apply the migration to create the necessary tables and functions:

```bash
# If using Supabase CLI
supabase migration up

# Or manually run the SQL file
psql -d your_database -f supabase/migrations/create_daily_stock_snapshots.sql
```

### 2. Access the Feature

1. Log in as an **admin** user
2. Navigate to the **Dashboard**
3. Scroll down to see the "Daily Stock & Sales Overview" section (admin-only)

## Usage

### Viewing Daily Snapshots

1. The dashboard automatically displays today's snapshots for all locations
2. If snapshots don't exist, they are automatically created when an admin views the dashboard
3. Use the "Refresh Snapshots" button to manually recalculate snapshots

### Manual Snapshot Calculation

#### Via Dashboard
- Click the "Refresh Snapshots" button in the Daily Stock & Sales Overview section

#### Via API
```bash
# Calculate snapshots for today
curl -X POST http://your-domain/api/daily-snapshots \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-01-15"}'

# Calculate snapshots for a specific date
curl -X POST http://your-domain/api/daily-snapshots \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-01-15"}'
```

#### Via Script
```bash
# Calculate for today
npx tsx scripts/calculate-daily-snapshots.ts

# Calculate for a specific date
npx tsx scripts/calculate-daily-snapshots.ts 2024-01-15
```

## Automated Daily Calculation

### Option 1: Cron Job (Recommended)

Set up a cron job to automatically calculate snapshots daily:

```bash
# Add to crontab (runs at midnight every day)
0 0 * * * curl -X POST https://your-domain/api/daily-snapshots/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Note**: Set `CRON_SECRET` environment variable in your `.env` file for security.

### Option 2: Supabase Edge Function

Create a Supabase Edge Function that runs on a schedule:

```sql
-- Create a scheduled function (requires pg_cron extension)
SELECT cron.schedule(
  'daily-stock-snapshots',
  '0 0 * * *', -- Run at midnight daily
  $$
  SELECT create_daily_snapshots_for_all_locations(CURRENT_DATE);
  $$
);
```

### Option 3: External Cron Service

Use services like:
- **Vercel Cron Jobs** (if deployed on Vercel)
- **GitHub Actions** (scheduled workflows)
- **Cron-job.org** (free external cron service)

Example for Vercel:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/daily-snapshots/cron",
    "schedule": "0 0 * * *"
  }]
}
```

## How It Works

1. **Opening Stock Value**: 
   - Uses previous day's closing stock value if available
   - Otherwise calculates current stock value (quantity × cost)

2. **Closing Stock Value**: 
   - For today: Uses current stock value
   - For past dates: Calculates based on historical data

3. **Sales Data**: 
   - Opening Sales: First sale amount of the day
   - Closing Sales: Last sale amount of the day
   - Total Sales: Sum of all sales for the day

## Permissions

- **Sales Data (All Users)**: Opening sales, closing sales, and total sales are visible to all authenticated users (admin, manager, staff)
- **Stock Values (Admin Only)**: Opening stock value, closing stock value, and stock change are only visible to users with the `admin` role
- **Dashboard Access**: 
  - All users can view the "Daily Sales Overview" section
  - Only admins can view the "Daily Stock Values Overview" section
  - Only admins can refresh/calculate snapshots
- **API Access**: 
  - All authenticated users can access sales data via API
  - Only admins can access stock value data and create snapshots

## Troubleshooting

### Snapshots Not Appearing

1. **Check if you're logged in as admin**: Only admins can see this section
2. **Click "Refresh Snapshots"**: Manually trigger snapshot calculation
3. **Check database migration**: Ensure the migration has been applied
4. **Check locations exist**: Ensure you have inventory locations configured

### Incorrect Stock Values

1. **Verify product costs**: Stock values are calculated using product variant costs
2. **Check stock levels**: Ensure stock levels are properly tracked
3. **Refresh snapshots**: Recalculate to get updated values

### API Errors

1. **Check authentication**: Ensure you're logged in as admin
2. **Verify date format**: Use YYYY-MM-DD format for dates
3. **Check server logs**: Review error messages for details

## Future Enhancements

Potential improvements:
- Historical stock value tracking (not just current calculations)
- Export to CSV/Excel
- Date range filtering
- Charts and graphs for trends
- Email reports
- Stock value alerts

## Related Files

- `supabase/migrations/create_daily_stock_snapshots.sql` - Database migration
- `app/api/daily-snapshots/route.ts` - API endpoints
- `app/api/daily-snapshots/cron/route.ts` - Cron job endpoint
- `app/(protected)/dashboard/page.tsx` - Dashboard display
- `components/dashboard/daily-snapshots-refresh.tsx` - Refresh component
- `scripts/calculate-daily-snapshots.ts` - Manual calculation script

