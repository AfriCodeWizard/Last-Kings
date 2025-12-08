"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Warehouse, ArrowRightLeft, ClipboardList } from "lucide-react"
import Link from "next/link"
import { StockLevelsClient } from "./stock-levels-client"
import { supabase } from "@/lib/supabase/client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function InventoryPage() {
  const [stockLevels, setStockLevels] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load locations first (fast, small table)
      const [locationsRes, stockLevelsRes] = await Promise.all([
        supabase
          .from("inventory_locations")
          .select("id, name, type")
          .order("name")
          .limit(50),
        supabase
          .from("stock_levels")
          .select(`
            id,
            variant_id,
            location_id,
            quantity,
            product_variants!inner(
              id,
              size_ml,
              sku,
              products!inner(
                brand_id,
                product_type,
                brands!inner(name)
              )
            ),
            inventory_locations!inner(id, name, type)
          `)
          .limit(10000)
      ])

      if (locationsRes.error) throw locationsRes.error
      if (stockLevelsRes.error) throw stockLevelsRes.error

      setLocations(locationsRes.data || [])
      setStockLevels(stockLevelsRes.data || [])
    } catch (error) {
      console.error("Error loading inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  // Get location IDs for filtering
  const floorLocation = locations?.find((loc: { type: string }) => loc.type === "floor")
  const backroomLocation = locations?.find((loc: { type: string }) => loc.type === "backroom")
  const warehouseLocation = locations?.find((loc: { type: string }) => loc.type === "warehouse")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner message="Loading inventory..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">Inventory</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage stock levels and locations</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/inventory/transfer" prefetch={true} className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          </Link>
          <Link href="/inventory/cycle-count" prefetch={true} className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto">
              <ClipboardList className="mr-2 h-4 w-4" />
              Cycle Count
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {locations?.map((location: { id: string; name: string; type: string }) => (
          <Card key={location.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-gold" />
                {location.name}
              </CardTitle>
              <CardDescription>{location.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stockLevels?.filter((s: { location_id: string }) => 
                  s.location_id === location.id
                ).reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0) || 0}
              </div>
              <p className="text-sm text-muted-foreground">Total items</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
          <CardDescription>Current inventory by location and product type</CardDescription>
        </CardHeader>
        <CardContent>
          <StockLevelsClient
            stockLevels={stockLevels || []}
            floorLocationId={floorLocation?.id}
            backroomLocationId={backroomLocation?.id}
            warehouseLocationId={warehouseLocation?.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
