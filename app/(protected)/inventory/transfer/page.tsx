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
            const { error: reduceError } = await (supabase
              .from("stock_levels") as any)
              .update({ quantity: (stock.quantity || 0) - transferQty })
              .eq("id", stock.id)

            if (reduceError) throw reduceError

            // Add to destination location
            const destStockQuery = (supabase
              .from("stock_levels") as any)
              .select("id, quantity")
              .eq("variant_id", item.variant_id)
              .eq("location_id", destinationLocationId)
            
            if (stock.lot_number) {
              destStockQuery.eq("lot_number", stock.lot_number)
            } else {
              destStockQuery.is("lot_number", null)
            }
            
            const { data: destStock, error: destError } = await destStockQuery.single()

            if (destError && destError.code !== 'PGRST116') throw destError

            if (destStock) {
              // Update existing stock
              const { error: updateError } = await (supabase
                .from("stock_levels") as any)
                .update({ quantity: (destStock as any).quantity + transferQty })
                .eq("id", destStock.id)

              if (updateError) throw updateError
            } else {
              // Create new stock entry
              const { error: insertError } = await (supabase
                .from("stock_levels") as any)
                .insert({
                  variant_id: item.variant_id,
                  location_id: destinationLocationId,
                  quantity: transferQty,
                  lot_number: stock.lot_number,
                })

              if (insertError) throw insertError
            }

            // Create transaction records for transfer trail
            const sourceLocationName = locations.find(l => l.id === sourceLocationId)?.name || 'Unknown'
            const destLocationName = locations.find(l => l.id === destinationLocationId)?.name || 'Unknown'
            
            const { error: outTxError } = await supabase
              .from("inventory_transactions")
              .insert({
                variant_id: item.variant_id,
                location_id: sourceLocationId,
                transaction_type: "transfer" as const,
                quantity_change: -transferQty,
                lot_number: stock.lot_number,
                notes: `Transferred ${transferQty} units to ${destLocationName}`,
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
                notes: `Transferred ${transferQty} units from ${sourceLocationName}`,
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

      toast.success("Transfer completed successfully! Transfer trail has been recorded.")
      // Reset state
      setTransferItems([])
      setSourceLocationId("")
      setDestinationLocationId("")
      loadAvailableProducts()
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

