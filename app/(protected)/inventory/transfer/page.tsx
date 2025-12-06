"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRightLeft, X, Search } from "lucide-react"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [availableProducts, setAvailableProducts] = useState<Array<{
    variant_id: string
    brand_name: string
    size_ml: number
    quantity: number
    lot_number: string | null
  }>>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    loadLocations()
  }, [])

  useEffect(() => {
    if (sourceLocationId) {
      loadAvailableProducts()
    } else {
      setAvailableProducts([])
    }
  }, [sourceLocationId])

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

  const loadAvailableProducts = async () => {
    if (!sourceLocationId) return

    setLoadingProducts(true)
    try {
      const { data: stockLevels, error } = await supabase
        .from("stock_levels")
        .select(`
          variant_id,
          quantity,
          lot_number,
          product_variants!inner(
            id,
            size_ml,
            products!inner(
              brands!inner(name)
            )
          )
        `)
        .eq("location_id", sourceLocationId)
        .gt("quantity", 0)

      if (error) throw error

      if (stockLevels) {
        // Group by variant_id and sum quantities
        const productMap = new Map<string, {
          variant_id: string
          brand_name: string
          size_ml: number
          quantity: number
          lot_number: string | null
        }>()

        stockLevels.forEach((stock: any) => {
          const variant = Array.isArray(stock.product_variants)
            ? stock.product_variants[0]
            : stock.product_variants
          const products = variant?.products
          const brandName = products
            ? (Array.isArray(products)
                ? (products[0]?.brands
                    ? (Array.isArray(products[0].brands)
                        ? products[0].brands[0]?.name
                        : products[0].brands?.name)
                    : 'Unknown Brand')
                : (products?.brands
                    ? (Array.isArray(products.brands)
                        ? products.brands[0]?.name
                        : products.brands?.name)
                    : 'Unknown Brand'))
            : 'Unknown Brand'

          const key = stock.variant_id
          if (productMap.has(key)) {
            const existing = productMap.get(key)!
            existing.quantity += stock.quantity || 0
          } else {
            productMap.set(key, {
              variant_id: stock.variant_id,
              brand_name: brandName,
              size_ml: variant?.size_ml || 0,
              quantity: stock.quantity || 0,
              lot_number: stock.lot_number,
            })
          }
        })

        setAvailableProducts(Array.from(productMap.values()))
      }
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Error loading available products")
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleAddProduct = (product: {
    variant_id: string
    brand_name: string
    size_ml: number
    quantity: number
    lot_number: string | null
  }) => {
    const existingItem = transferItems.find((item) => item.variant_id === product.variant_id)

    if (existingItem) {
      setTransferItems((prev) =>
        prev.map((item) =>
          item.variant_id === product.variant_id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.current_stock) }
            : item
        )
      )
      toast.success("Quantity increased")
    } else {
      const newItem: TransferItem = {
        variant_id: product.variant_id,
        brand_name: product.brand_name,
        size_ml: product.size_ml,
        quantity: 1,
        lot_number: product.lot_number,
        current_stock: product.quantity,
      }
      setTransferItems((prev) => [...prev, newItem])
      toast.success("Product added to transfer")
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

    const startTime = performance.now()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      const sourceLocationName = locations.find(l => l.id === sourceLocationId)?.name || 'Unknown'
      const destLocationName = locations.find(l => l.id === destinationLocationId)?.name || 'Unknown'

      // Batch fetch all source stock data in parallel
      const stockQueries = transferItems.map(item =>
        supabase
          .from("stock_levels")
          .select("id, quantity, lot_number")
          .eq("variant_id", item.variant_id)
          .eq("location_id", sourceLocationId)
          .order("lot_number", { ascending: true })
      )

      const stockResults = await Promise.all(stockQueries)
      
      // Validate stock availability first
      for (let i = 0; i < transferItems.length; i++) {
        const item = transferItems[i]
        const { data: sourceStock, error: stockError } = stockResults[i]
        
        if (stockError) throw stockError
        
        const totalAvailable = (sourceStock as Array<{ quantity: number }> || [])
          .reduce((sum, s) => sum + (s.quantity || 0), 0)
        
        if (totalAvailable < item.quantity) {
          toast.error(`Insufficient stock for ${item.brand_name}. Available: ${totalAvailable}, Requested: ${item.quantity}`)
          return
        }
      }

      // Prepare all operations in batches
      const stockUpdates: Array<{ id: string; quantity: number }> = []
      const stockInserts: Array<{ variant_id: string; location_id: string; quantity: number; lot_number: string | null }> = []
      const transactions: Array<any> = []
      const destStockQueries: Array<Promise<any>> = []
      const destStockMap = new Map<string, { id: string; quantity: number }>()

      // First, collect all destination stock queries we need
      for (let i = 0; i < transferItems.length; i++) {
        const item = transferItems[i]
        const { data: sourceStock } = stockResults[i]
        const stockData = (sourceStock as Array<{ lot_number: string | null }>) || []
        
        // Get unique lot numbers for this variant
        const lotNumbers = [...new Set(stockData.map(s => s.lot_number))]
        
        for (const lotNumber of lotNumbers) {
          const key = `${item.variant_id}_${lotNumber || 'null'}`
          if (!destStockMap.has(key)) {
            const query = (supabase
              .from("stock_levels") as any)
              .select("id, quantity")
              .eq("variant_id", item.variant_id)
              .eq("location_id", destinationLocationId)
            
            if (lotNumber) {
              query.eq("lot_number", lotNumber)
            } else {
              query.is("lot_number", null)
            }
            
            destStockQueries.push(
              query.maybeSingle().then((result: any) => {
                if (result.data) {
                  destStockMap.set(key, result.data)
                }
                return result
              })
            )
          }
        }
      }

      // Execute all destination stock queries in parallel
      await Promise.all(destStockQueries)

      // Process all items and prepare batch operations
      for (let i = 0; i < transferItems.length; i++) {
        const item = transferItems[i]
        const { data: sourceStock } = stockResults[i]
        const stockData = (sourceStock as Array<{ id: string; quantity: number; lot_number: string | null }>) || []
        let remainingToTransfer = item.quantity

        for (const stock of stockData) {
          if (remainingToTransfer <= 0) break

          const transferQty = Math.min(remainingToTransfer, stock.quantity || 0)

          if (transferQty > 0) {
            // Prepare source stock update
            stockUpdates.push({
              id: stock.id,
              quantity: (stock.quantity || 0) - transferQty
            })

            // Get destination stock from map
            const key = `${item.variant_id}_${stock.lot_number || 'null'}`
            const destStock = destStockMap.get(key)

            if (destStock) {
              // Prepare destination stock update
              stockUpdates.push({
                id: destStock.id,
                quantity: destStock.quantity + transferQty
              })
            } else {
              // Prepare destination stock insert
              stockInserts.push({
                variant_id: item.variant_id,
                location_id: destinationLocationId,
                quantity: transferQty,
                lot_number: stock.lot_number,
              })
            }

            // Prepare transaction records
            transactions.push({
              variant_id: item.variant_id,
              location_id: sourceLocationId,
              transaction_type: "transfer" as const,
              quantity_change: -transferQty,
              lot_number: stock.lot_number,
              notes: `Transferred ${transferQty} units to ${destLocationName}`,
              created_by: user.id,
            })

            transactions.push({
              variant_id: item.variant_id,
              location_id: destinationLocationId,
              transaction_type: "transfer" as const,
              quantity_change: transferQty,
              lot_number: stock.lot_number,
              notes: `Transferred ${transferQty} units from ${sourceLocationName}`,
              created_by: user.id,
            })

            remainingToTransfer -= transferQty
          }
        }
      }

      // Execute all operations in parallel batches
      const updatePromises = stockUpdates.map(update =>
        (supabase.from("stock_levels") as any)
          .update({ quantity: update.quantity })
          .eq("id", update.id)
      )

      const insertPromises = stockInserts.length > 0
        ? [(supabase.from("stock_levels") as any).insert(stockInserts)]
        : []

      const transactionPromises = transactions.length > 0
        ? [(supabase.from("inventory_transactions") as any).insert(transactions)]
        : []

      // Execute all batches in parallel
      const allResults = await Promise.all([
        ...updatePromises,
        ...insertPromises,
        ...transactionPromises
      ])

      // Check for errors
      for (const result of allResults) {
        if (result.error) throw result.error
      }

      const endTime = performance.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      // Success notification with vibration
      const { vibrateComplete } = await import('@/lib/vibration')
      vibrateComplete()
      
      toast.success(`Transfer completed successfully! (${duration}s)`, {
        description: `${transferItems.length} item(s) transferred from ${sourceLocationName} to ${destLocationName}`,
        duration: 5000,
      })

      // Reset state
      setTransferItems([])
      setSourceLocationId("")
      setDestinationLocationId("")
      loadAvailableProducts()
    } catch (error) {
      console.error("Transfer error:", error)
      toast.error(error instanceof Error ? error.message : "Error completing transfer")
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
            <CardDescription>Select products available at source location to transfer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by brand name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {loadingProducts ? (
              <p className="text-sm text-muted-foreground">Loading products...</p>
            ) : availableProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products available at source location</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableProducts
                  .filter((p) =>
                    p.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((product) => (
                    <div
                      key={product.variant_id}
                      className="flex justify-between items-center p-3 rounded-lg border border-gold/10 hover:bg-gold/5 cursor-pointer"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div>
                        <div className="font-medium">{product.brand_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.size_ml}ml • Available: {product.quantity}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Add
                      </Button>
                    </div>
                  ))}
              </div>
            )}
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

    </div>
  )
}

