import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// This endpoint can be called by a cron job to automatically calculate daily snapshots
// It should be protected with a secret token in production
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication token check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    const date = body.date || new Date().toISOString().split('T')[0]

    // Call the database function to create snapshots for all locations
    const { data, error } = await supabase.rpc('create_daily_snapshots_for_all_locations', {
      p_date: date
    })

    if (error) {
      console.error("Error creating daily snapshots:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Daily snapshots created successfully',
      snapshots: data,
      date 
    })
  } catch (error: any) {
    console.error("Error in cron job:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({ 
    message: 'Daily snapshots cron endpoint',
    usage: 'POST to this endpoint with optional date parameter to create snapshots'
  })
}

