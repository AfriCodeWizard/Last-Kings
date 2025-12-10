import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

// GET: Retrieve daily snapshots
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    // All authenticated users can access sales data, but stock values are admin-only
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get all locations
    const { data: locations, error: locationsError } = await supabase
      .from("inventory_locations")
      .select("id, name, type")
      .order("name")

    if (locationsError) {
      return NextResponse.json({ error: locationsError.message }, { status: 500 })
    }

    // Get or create snapshots for each location
    const snapshots = await Promise.all(
      (locations || []).map(async (location) => {
        // Check if snapshot exists
        const { data: existing } = await supabase
          .from("daily_stock_snapshots")
          .select("*")
          .eq("snapshot_date", date)
          .eq("location_id", location.id)
          .single()

        if (existing) {
          // For non-admin users, exclude stock values
          if (user.role !== 'admin') {
            const { opening_stock_value, closing_stock_value, ...salesData } = existing
            return { ...salesData, location }
          }
          return { ...existing, location }
        }

        // Only admins can create snapshots
        if (user.role !== 'admin') {
          return {
            snapshot_date: date,
            location_id: location.id,
            opening_sales: 0,
            closing_sales: 0,
            total_sales: 0,
            location
          }
        }

        // Create snapshot if it doesn't exist (admin only)
        const { data: snapshot, error } = await supabase.rpc('create_daily_snapshot', {
          p_date: date,
          p_location_id: location.id
        })

        if (error) {
          console.error(`Error creating snapshot for location ${location.id}:`, error)
          return {
            snapshot_date: date,
            location_id: location.id,
            opening_stock_value: 0,
            closing_stock_value: 0,
            opening_sales: 0,
            closing_sales: 0,
            total_sales: 0,
            location
          }
        }

        return { ...snapshot, location }
      })
    )

    return NextResponse.json({ snapshots, date })
  } catch (error: any) {
    console.error("Error fetching daily snapshots:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Calculate and store snapshots for a specific date
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    // Only admins can access this
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const date = body.date || new Date().toISOString().split('T')[0]

    // Get all locations
    const { data: locations, error: locationsError } = await supabase
      .from("inventory_locations")
      .select("id, name, type")
      .order("name")

    if (locationsError) {
      return NextResponse.json({ error: locationsError.message }, { status: 500 })
    }

    // Create snapshots for each location
    const snapshots = await Promise.all(
      (locations || []).map(async (location) => {
        const { data: snapshot, error } = await supabase.rpc('create_daily_snapshot', {
          p_date: date,
          p_location_id: location.id
        })

        if (error) {
          console.error(`Error creating snapshot for location ${location.id}:`, error)
          return null
        }

        return { ...snapshot, location }
      })
    )

    const validSnapshots = snapshots.filter(s => s !== null)

    return NextResponse.json({ 
      message: 'Snapshots created successfully',
      snapshots: validSnapshots,
      date 
    })
  } catch (error: any) {
    console.error("Error creating daily snapshots:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

