"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { UserRole } from "@/types/supabase"
import { Edit, Trash2, Save, X } from "lucide-react"

interface StockLevel {
  id: string
  quantity: number
  lot_number: string | null
  variant_id: string
  product_variants: {
    id: string
    sku: string
    size_ml: number
    cost: number
    price: number
    products: { brands: { name: string } }
  }
}

interface StockLevelsClientProps {
  stockLevels: StockLevel[]
  floorLocationId?: string
  backroomLocationId?: string
  warehouseLocationId?: string
  userRole?: UserRole | null
  onStockUpdated?: () => void
}

export function StockLevelsClient({
  stockLevels,
  floorLocationId,
  backroomLocationId,
  warehouseLocationId,
  userRole,
  onStockUpdated,
}: StockLevelsClientProps) {
  // Use stable string identifiers for tabs (never change)
  const [locationTab, setLocationTab] = useState<"floor" | "backroom" | "warehouse">("floor")
  const [productTypeTab, setProductTypeTab] = useState<"all" | "liquor" | "beverage">("all")

  const filterStockByLocationAndType = (
    locationId: string | undefined,
    productType: "liquor" | "beverage" | "all"
  ) => {
    if (!locationId || !stockLevels) return []
    let filtered = stockLevels.filter((s: any) => s.location_id === locationId)
    if (productType !== "all") {
      filtered = filtered.filter((s: any) => {
        const variant = Array.isArray(s.product_variants) ? s.product_variants[0] : s.product_variants
        return variant?.products?.product_type === productType
      })
    }
    return filtered
  }

  return (
    <div className="space-y-4">
      <Tabs value={locationTab} onValueChange={(v) => setLocationTab(v as "floor" | "backroom" | "warehouse")} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="floor">Main Floor</TabsTrigger>
          <TabsTrigger value="backroom">Backroom</TabsTrigger>
          <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
        </TabsList>

        <TabsContent value="floor" className="mt-4">
          <div className="space-y-4">
            <Tabs value={productTypeTab} onValueChange={(v) => setProductTypeTab(v as "all" | "liquor" | "beverage")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="liquor">Liquor</TabsTrigger>
                <TabsTrigger value="beverage">Beverages</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "all")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "liquor")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "beverage")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="backroom" className="mt-4">
          <div className="space-y-4">
            <Tabs value={productTypeTab} onValueChange={(v) => setProductTypeTab(v as "all" | "liquor" | "beverage")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="liquor">Liquor</TabsTrigger>
                <TabsTrigger value="beverage">Beverages</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "all")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "liquor")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "beverage")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="warehouse" className="mt-4">
          <div className="space-y-4">
            <Tabs value={productTypeTab} onValueChange={(v) => setProductTypeTab(v as "all" | "liquor" | "beverage")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="liquor">Liquor</TabsTrigger>
                <TabsTrigger value="beverage">Beverages</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "all")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "liquor")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "beverage")} userRole={userRole} onStockUpdated={onStockUpdated} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StockTable({ stockLevels, userRole, onStockUpdated }: { stockLevels: StockLevel[], userRole?: UserRole | null, onStockUpdated?: () => void }) {
  const isAdmin = userRole === 'admin'
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Buying Price</TableHead>
            <TableHead>Selling Price</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Lot Number</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockLevels && stockLevels.length > 0 ? (
            stockLevels.map((stock) => {
              const variant = Array.isArray(stock.product_variants) 
                ? stock.product_variants[0] 
                : stock.product_variants
              return (
                <StockRow 
                  key={stock.id} 
                  stock={stock} 
                  variant={variant}
                  isAdmin={isAdmin}
                  onStockUpdated={onStockUpdated}
                />
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground">
                No stock levels found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function StockRow({ 
  stock, 
  variant, 
  isAdmin,
  onStockUpdated
}: { 
  stock: StockLevel
  variant: any
  isAdmin: boolean
  onStockUpdated?: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedQuantity, setEditedQuantity] = useState(stock.quantity.toString())
  const [saving, setSaving] = useState(false)
  const [currentQuantity, setCurrentQuantity] = useState(stock.quantity)

  // Update local quantity when stock prop changes
  useEffect(() => {
    setCurrentQuantity(stock.quantity)
    if (!isEditing) {
      setEditedQuantity(stock.quantity.toString())
    }
  }, [stock.quantity, isEditing])

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditedQuantity(currentQuantity.toString())
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedQuantity(currentQuantity.toString())
    // No router calls, just reset local state
  }

  const handleSave = async () => {
    const newQuantity = parseInt(editedQuantity)
    
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error("Please enter a valid quantity (0 or greater)")
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase
        .from("stock_levels") as any)
        .update({ quantity: newQuantity })
        .eq("id", stock.id)

      if (error) {
        throw error
      }

      toast.success("Quantity updated successfully")
      setIsEditing(false)
      setCurrentQuantity(newQuantity)
      
      // Call the callback to refresh data if provided (this is async and safe)
      if (onStockUpdated) {
        // Use setTimeout to avoid server component errors
        setTimeout(() => {
          onStockUpdated()
        }, 0)
      }
    } catch (error: any) {
      console.error("Error updating quantity:", error)
      toast.error(`Error updating quantity: ${error.message || "Unknown error"}`)
      // Don't close edit mode on error so user can retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {variant?.products?.brands?.name || "Unknown"}
      </TableCell>
      <TableCell>{variant?.sku || "-"}</TableCell>
      <TableCell>{variant?.size_ml || 0}ml</TableCell>
      <TableCell>{variant?.cost ? formatCurrency(variant.cost) : "-"}</TableCell>
      <TableCell>{variant?.price ? formatCurrency(variant.price) : "-"}</TableCell>
      <TableCell>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={editedQuantity}
              onChange={(e) => setEditedQuantity(e.target.value)}
              className="w-20 h-8"
              min="0"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                } else if (e.key === "Escape") {
                  handleCancel()
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              <Save className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={currentQuantity < 10 ? "text-destructive font-bold" : ""}>
              {currentQuantity}
            </span>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartEdit}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>{stock.lot_number || "-"}</TableCell>
      <TableCell>
        {stock.quantity < 10 ? (
          <Badge variant="destructive">Low Stock</Badge>
        ) : stock.quantity < 25 ? (
          <Badge variant="secondary">Medium</Badge>
        ) : (
          <Badge variant="default">In Stock</Badge>
        )}
      </TableCell>
      {isAdmin && variant?.id && (
        <TableCell>
          <ProductActions variantId={variant.id} productName={variant?.products?.brands?.name || "Product"} />
        </TableCell>
      )}
      {isAdmin && !variant?.id && (
        <TableCell>-</TableCell>
      )}
    </TableRow>
  )
}

function ProductActions({ variantId, productName }: { variantId?: string, productName: string }) {
  const handleEdit = async () => {
    if (!variantId) {
      toast.error("Product variant ID is missing")
      return
    }
    
    try {
      // Get product_id, then navigate directly to edit page
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("product_id")
        .eq("id", variantId)
        .single()

      if (variantError || !variant) {
        toast.error("Failed to find product")
        console.error("Error fetching variant:", variantError)
        return
      }

      const variantTyped = variant as { product_id: string }
      // Use window.location for navigation to avoid server component errors
      window.location.href = `/products/${variantTyped.product_id}/edit`
    } catch (error: any) {
      console.error("Error loading product:", error)
      toast.error("Failed to load product")
    }
  }

  const handleDelete = async () => {
    if (!variantId) return
    
    if (!confirm(`Are you sure you want to delete ${productName}? This will also delete all associated stock levels, sales, and purchase order items. This action cannot be undone.`)) {
      return
    }

    try {
      // First, get the product_id from the variant
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("product_id")
        .eq("id", variantId)
        .single()

      if (variantError || !variant) {
        throw new Error("Failed to find product variant")
      }

      const variantTyped = variant as { product_id: string }

      // Delete the variant (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", variantId)

      if (deleteError) {
        throw deleteError
      }

      // Check if there are other variants for this product
      const { data: otherVariants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", variantTyped.product_id)
        .limit(1)

      // If no other variants, delete the product too
      if (!otherVariants || otherVariants.length === 0) {
        await supabase
          .from("products")
          .delete()
          .eq("id", variantTyped.product_id)
      }

      toast.success("Product deleted successfully")
      window.location.reload()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Failed to delete product")
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleEdit}
        className="h-8"
      >
        <Edit className="h-4 w-4 mr-1" />
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        className="h-8"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
    </div>
  )
}

