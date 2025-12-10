/**
 * Script to calculate daily stock snapshots
 * Can be run manually or scheduled as a cron job
 * 
 * Usage:
 *   npx tsx scripts/calculate-daily-snapshots.ts [date]
 * 
 * If no date is provided, it will use today's date
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function calculateSnapshots(date: string) {
  console.log(`Calculating daily snapshots for ${date}...`)

  try {
    // Get all locations
    const { data: locations, error: locationsError } = await supabase
      .from('inventory_locations')
      .select('id, name, type')
      .order('name')

    if (locationsError) {
      throw new Error(`Failed to fetch locations: ${locationsError.message}`)
    }

    if (!locations || locations.length === 0) {
      console.log('No locations found. Exiting.')
      return
    }

    console.log(`Found ${locations.length} location(s)`)

    // Create snapshots for each location
    const results = await Promise.all(
      locations.map(async (location) => {
        const { data: snapshot, error } = await supabase.rpc('create_daily_snapshot', {
          p_date: date,
          p_location_id: location.id
        })

        if (error) {
          console.error(`Error creating snapshot for ${location.name}:`, error.message)
          return { location: location.name, success: false, error: error.message }
        }

        console.log(`✓ Created snapshot for ${location.name}:`)
        console.log(`  Opening Stock: ${snapshot.opening_stock_value}`)
        console.log(`  Closing Stock: ${snapshot.closing_stock_value}`)
        console.log(`  Total Sales: ${snapshot.total_sales}`)

        return { location: location.name, success: true, snapshot }
      })
    )

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`\nSummary:`)
    console.log(`  Successful: ${successful}`)
    console.log(`  Failed: ${failed}`)
    console.log(`\nDaily snapshots calculation completed for ${date}`)
  } catch (error: any) {
    console.error('Error calculating snapshots:', error.message)
    process.exit(1)
  }
}

// Get date from command line argument or use today
const dateArg = process.argv[2]
const date = dateArg || new Date().toISOString().split('T')[0]

// Validate date format
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Invalid date format. Please use YYYY-MM-DD')
  process.exit(1)
}

calculateSnapshots(date)
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

