"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRightLeft, ScanLine, X } from "lucide-react"
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

interface TransferItem {
  variant_id: string
  brand_name: string
  size_ml: number
  quantity: number
  lot_number: string | null
  current_stock: number
}

interface Location {
  id: string
  name: string
  type: string
}

export default function TransferPage() {
  const router = useRouter()
  const [sourceLocationId, setSourceLocationId] = useState<string>("")
  const [destinationLocationId, setDestinationLocationId] = useState<string>("")
  const [locations, setLocations] = useState<Location[]>([])
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])
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

  const handleBarcodeScan = async (barcode: string) => {
    if (!sourceLocationId) {
      toast.error("Please select source location first")
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

      // Get current stock at source location
      const { data: stock, error: stockError } = await supabase
        .from("stock_levels")
        .select("quantity, lot_number")
        .eq("variant_id", variant.id)
        .eq("location_id", sourceLocationId)
        .order("lot_number", { ascending: true })

      if (stockError) throw stockError

      const stockData = (stock as Array<{ quantity: number; lot_number: string | null }>) || []
      const totalStock = stockData.reduce((sum, s) => sum + (s.quantity || 0), 0)

      if (totalStock === 0) {
        toast.error("No stock available at source location")
        return
      }

      const existingItem = transferItems.find((item) => item.variant_id === variant.id)

      if (existingItem) {
        setTransferItems((prev) =>
          prev.map((item) =>
            item.variant_id === variant.id
              ? { ...item, quantity: Math.min(item.quantity + 1, item.current_stock) }
              : item
          )
        )
        toast.success("Quantity increased")
      } else {
        const newItem: TransferItem = {
          variant_id: variant.id,
          brand_name: variant.products.brands?.name || "",
          size_ml: variant.size_ml,
          quantity: 1,
          lot_number: stockData[0]?.lot_number || null,
          current_stock: totalStock,
        }
        setTransferItems((prev) => [...prev, newItem])
        toast.success("Product added to transfer")
      }
    } catch (error) {
      toast.error("Error processing barcode")
      console.error(error)
    }
  }

  const handleQuantityChange = (variantId: string, newQuantity: number) => {
    setTransferItems((prev) =>
      prev.map((item) =>
        item.variant_id === variantId
          ? { ...item, quantity: Math.max(1, Math.min(newQuantity, item.current_stock)) }
          : item
      )
    )
  }

  const handleRemoveItem = (variantId: string) => {
    setTransferItems((prev) => prev.filter((item) => item.variant_id !== variantId))
  }

  const handleCompleteTransfer = async () => {
    if (!sourceLocationId || !destinationLocationId) {
      toast.error("Please select both source and destination locations")
      return
    }

    if (sourceLocationId === destinationLocationId) {
      toast.error("Source and destination must be different")
      return
    }

    if (transferItems.length === 0) {
      toast.error("No items to transfer")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      // Process each transfer item
      for (const item of transferItems) {
        // Check available stock
        const { data: sourceStock, error: stockError } = await supabase
          .from("stock_levels")
          .select("id, quantity, lot_number")
          .eq("variant_id", item.variant_id)
          .eq("location_id", sourceLocationId)
          .order("lot_number", { ascending: true })

        if (stockError) throw stockError

        const stockData = (sourceStock as Array<{ id: string; quantity: number; lot_number: string | null }>) || []
        let remainingToTransfer = item.quantity

        for (const stock of stockData) {
          if (remainingToTransfer <= 0) break

          const transferQty = Math.min(remainingToTransfer, stock.quantity || 0)

          if (transferQty > 0) {
            // Reduce from source location
            const { error: reduceError } = await supabase
              .from("stock_levels")
              .update({ quantity: (stock.quantity || 0) - transferQty })
              .eq("id", stock.id)

            if (reduceError) throw reduceError

            // Add to destination location
            const { data: destStock, error: destError } = await supabase
              .from("stock_levels")
              .select("id")
              .eq("variant_id", item.variant_id)
              .eq("location_id", destinationLocationId)
              .eq("lot_number", stock.lot_number)
              .single()

            if (destError && destError.code !== 'PGRST116') throw destError

            if (destStock) {
              // Update existing stock
              const { error: updateError } = await supabase
                .from("stock_levels")
                .update({ quantity: (destStock as any).quantity + transferQty })
                .eq("id", destStock.id)

              if (updateError) throw updateError
            } else {
              // Create new stock entry
              const { error: insertError } = await supabase
                .from("stock_levels")
                .insert({
                  variant_id: item.variant_id,
                  location_id: destinationLocationId,
                  quantity: transferQty,
                  lot_number: stock.lot_number,
                })

              if (insertError) throw insertError
            }

            // Create transaction records
            const { error: outTxError } = await supabase
              .from("inventory_transactions")
              .insert({
                variant_id: item.variant_id,
                location_id: sourceLocationId,
                transaction_type: "transfer" as const,
                quantity_change: -transferQty,
                lot_number: stock.lot_number,
                notes: `Transferred to ${locations.find(l => l.id === destinationLocationId)?.name}`,
                created_by: user.id,
              } as any)

            if (outTxError) throw outTxError

            const { error: inTxError } = await supabase
              .from("inventory_transactions")
              .insert({
                variant_id: item.variant_id,
                location_id: destinationLocationId,
                transaction_type: "transfer" as const,
                quantity_change: transferQty,
                lot_number: stock.lot_number,
                notes: `Transferred from ${locations.find(l => l.id === sourceLocationId)?.name}`,
                created_by: user.id,
              } as any)

            if (inTxError) throw inTxError

            remainingToTransfer -= transferQty
          }
        }

        if (remainingToTransfer > 0) {
          toast.error(`Insufficient stock for ${item.brand_name}`)
          return
        }
      }

      toast.success("Transfer completed successfully!")
      router.push("/inventory")
    } catch (error) {
      toast.error("Error completing transfer")
      console.error(error)
    }
  }

  const filteredItems = transferItems.filter((item) =>
    item.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">
            Transfer Inventory
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Move stock between locations
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source Location</CardTitle>
            <CardDescription>Where stock is moving from</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={sourceLocationId} onValueChange={setSourceLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source location" />
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

        <Card>
          <CardHeader>
            <CardTitle>Destination Location</CardTitle>
            <CardDescription>Where stock is moving to</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={destinationLocationId} onValueChange={setDestinationLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination location" />
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
      </div>

      {sourceLocationId && (
        <Card>
          <CardHeader>
            <CardTitle>Add Products</CardTitle>
            <CardDescription>Scan or search for products to transfer</CardDescription>
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
                disabled={!sourceLocationId}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {transferItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transfer Items ({transferItems.length})</CardTitle>
            <CardDescription>Review and adjust quantities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.variant_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.brand_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.size_ml}ml • Available: {item.current_stock}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`qty-${item.variant_id}`} className="sr-only">
                      Quantity
                    </Label>
                    <Input
                      id={`qty-${item.variant_id}`}
                      type="number"
                      min={1}
                      max={item.current_stock}
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(item.variant_id, parseInt(e.target.value) || 1)
                      }
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.variant_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {transferItems.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleCompleteTransfer}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Complete Transfer
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

