"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanLine, CheckCircle2, X } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { playScanBeep } from "@/lib/sound"
import { Badge } from "@/components/ui/badge"

interface CountItem {
  variant_id: string
  brand_name: string
  size_ml: number
  system_quantity: number
  physical_quantity: number
  lot_number: string | null
  stock_level_id: string
  difference: number
}

interface Location {
  id: string
  name: string
  type: string
}

export default function CycleCountPage() {
  const router = useRouter()
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [locations, setLocations] = useState<Location[]>([])
  const [countItems, setCountItems] = useState<CountItem[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from("inventory_locations")
      .select("*")
      .order("name")

    if (error) {
      toast.error("Error loading locations")
      return
    }

    if (data) {
      setLocations(data as Location[])
    }
  }

  const loadStockForLocation = async (locationId: string) => {
    const { data, error } = await supabase
      .from("stock_levels")
      .select(`
        id,
        quantity,
        lot_number,
        product_variants!inner(
          id,
          size_ml,
          products!inner(
            product_type,
            brands!inner(name)
          )
        )
      `)
      .eq("location_id", locationId)
      .gt("quantity", 0)
      .order("product_variants(id)")

    if (error) {
      toast.error("Error loading stock")
      return
    }

    if (data) {
      const items: CountItem[] = (data as any[]).map((stock: any) => ({
        variant_id: stock.product_variants.id,
        brand_name: stock.product_variants.products.brands?.name || "",
        size_ml: stock.product_variants.size_ml,
        system_quantity: stock.quantity,
        physical_quantity: stock.quantity, // Start with system quantity
        lot_number: stock.lot_number,
        stock_level_id: stock.id,
        difference: 0,
      }))
      setCountItems(items)
    }
  }

  useEffect(() => {
    if (selectedLocationId) {
      loadStockForLocation(selectedLocationId)
    } else {
      setCountItems([])
    }
  }, [selectedLocationId])

  const handleBarcodeScan = async (barcode: string) => {
    if (!selectedLocationId) {
      toast.error("Please select a location first")
      return
    }

    try {
      const { data: variants, error } = await supabase
        .from("product_variants")
        .select(`
          id,
          size_ml,
          products!inner(
            product_type,
            brands!inner(name)
          )
        `)
        .eq("upc", barcode.trim())
        .limit(1)

      if (error) throw error

      if (!variants || variants.length === 0) {
        toast.error("Product not found")
        return
      }

      const variant = variants[0] as any
      playScanBeep()

      // Check if item already exists in count
      const existingItem = countItems.find((item) => item.variant_id === variant.id)

      if (existingItem) {
        // Focus on this item for counting
        toast.success(`${variant.products.brands?.name || 'Product'} found in count list`)
        return
      }

      // Check if product exists at this location
      const { data: stock, error: stockError } = await supabase
        .from("stock_levels")
        .select("id, quantity, lot_number")
        .eq("variant_id", variant.id)
        .eq("location_id", selectedLocationId)
        .limit(1)
        .single()

      if (stockError && stockError.code !== 'PGRST116') throw stockError

      if (!stock) {
        toast.error("Product not found at this location")
        return
      }

      const stockData = stock as { id: string; quantity: number; lot_number: string | null }

      // Add to count items
      const newItem: CountItem = {
        variant_id: variant.id,
        brand_name: variant.products.brands?.name || "",
        size_ml: variant.size_ml,
        system_quantity: stockData.quantity || 0,
        physical_quantity: stockData.quantity || 0,
        lot_number: stockData.lot_number,
        stock_level_id: stockData.id,
        difference: 0,
      }

      setCountItems((prev) => [...prev, newItem])
      toast.success("Product added to count")
    } catch (error) {
      toast.error("Error processing barcode")
      console.error(error)
    }
  }

  const handlePhysicalQuantityChange = (stockLevelId: string, newQuantity: number) => {
    setCountItems((prev) =>
      prev.map((item) => {
        if (item.stock_level_id === stockLevelId) {
          const difference = newQuantity - item.system_quantity
          return {
            ...item,
            physical_quantity: Math.max(0, newQuantity),
            difference,
          }
        }
        return item
      })
    )
  }

  const handleRemoveItem = (stockLevelId: string) => {
    setCountItems((prev) => prev.filter((item) => item.stock_level_id !== stockLevelId))
  }

  const handleCompleteCycleCount = async () => {
    if (!selectedLocationId) {
      toast.error("Please select a location")
      return
    }

    if (countItems.length === 0) {
      toast.error("No items to count")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      let adjustmentsCount = 0

      // Process each count item
      for (const item of countItems) {
        if (item.difference === 0) continue // No adjustment needed

        // Update stock level
        const { error: updateError } = await supabase
          .from("stock_levels")
          .update({ quantity: item.physical_quantity } as any)
          .eq("id", item.stock_level_id)

        if (updateError) throw updateError

        // Create adjustment transaction
        const { error: txError } = await supabase
          .from("inventory_transactions")
          .insert({
            variant_id: item.variant_id,
            location_id: selectedLocationId,
            transaction_type: "cycle_count" as const,
            quantity_change: item.difference,
            lot_number: item.lot_number,
            notes: `Cycle count: System had ${item.system_quantity}, Physical count: ${item.physical_quantity}`,
            created_by: user.id,
          } as any)

        if (txError) throw txError

        adjustmentsCount++
      }

      if (adjustmentsCount > 0) {
        toast.success(`Cycle count completed! ${adjustmentsCount} adjustments made.`)
      } else {
        toast.success("Cycle count completed! No adjustments needed.")
      }

      router.push("/inventory")
    } catch (error) {
      toast.error("Error completing cycle count")
      console.error(error)
    }
  }

  const filteredItems = countItems.filter((item) =>
    item.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalDifferences = countItems.reduce((sum, item) => sum + Math.abs(item.difference), 0)
  const itemsWithDifferences = countItems.filter((item) => item.difference !== 0).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">
            Cycle Count
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Physical inventory count and adjustment
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Location</CardTitle>
            <CardDescription>Choose location to count</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedLocationId && countItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Count Summary</CardTitle>
              <CardDescription>Review discrepancies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-bold">{countItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items with Differences:</span>
                  <Badge variant={itemsWithDifferences > 0 ? "destructive" : "default"}>
                    {itemsWithDifferences}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Differences:</span>
                  <span className="font-bold">{totalDifferences}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedLocationId && (
        <Card>
          <CardHeader>
            <CardTitle>Count Products</CardTitle>
            <CardDescription>Scan or search for products to count</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setShowScanner(true)}
                disabled={!selectedLocationId}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {countItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Count Items ({countItems.length})</CardTitle>
            <CardDescription>
              Enter physical quantities. Differences will be adjusted automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.stock_level_id}
                  className={`p-4 border rounded-lg ${
                    item.difference !== 0 ? "border-destructive" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium">{item.brand_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.size_ml}ml • Lot: {item.lot_number || "N/A"}
                      </div>
                      <div className="mt-2 flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">System:</span>{" "}
                          <span className="font-medium">{item.system_quantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Physical:</span>{" "}
                          <span className="font-medium">{item.physical_quantity}</span>
                        </div>
                        {item.difference !== 0 && (
                          <div>
                            <span className="text-muted-foreground">Difference:</span>{" "}
                            <span
                              className={`font-bold ${
                                item.difference > 0 ? "text-green-500" : "text-destructive"
                              }`}
                            >
                              {item.difference > 0 ? "+" : ""}
                              {item.difference}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`qty-${item.stock_level_id}`} className="sr-only">
                        Physical Quantity
                      </Label>
                      <Input
                        id={`qty-${item.stock_level_id}`}
                        type="number"
                        min={0}
                        value={item.physical_quantity}
                        onChange={(e) =>
                          handlePhysicalQuantityChange(
                            item.stock_level_id,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-24"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.stock_level_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {countItems.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleCompleteCycleCount}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete Cycle Count
          </Button>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScan}
        />
      )}
    </div>
  )
}

