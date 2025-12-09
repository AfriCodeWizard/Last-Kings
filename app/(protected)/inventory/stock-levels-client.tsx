"use client"

import { useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { UserRole } from "@/types/supabase"

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
}

export function StockLevelsClient({
  stockLevels,
  floorLocationId,
  backroomLocationId,
  warehouseLocationId,
  userRole,
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
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "all")} userRole={userRole} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "liquor")} userRole={userRole} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "beverage")} userRole={userRole} />
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
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "all")} userRole={userRole} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "liquor")} userRole={userRole} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "beverage")} userRole={userRole} />
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
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "all")} userRole={userRole} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "liquor")} userRole={userRole} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "beverage")} userRole={userRole} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StockTable({ stockLevels, userRole }: { stockLevels: StockLevel[], userRole?: UserRole | null }) {
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
                <TableRow key={stock.id}>
                  <TableCell className="font-medium">
                    {variant?.products?.brands?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{variant?.sku || "-"}</TableCell>
                  <TableCell>{variant?.size_ml || 0}ml</TableCell>
                  <TableCell>{variant?.cost ? formatCurrency(variant.cost) : "-"}</TableCell>
                  <TableCell>{variant?.price ? formatCurrency(variant.price) : "-"}</TableCell>
                  <TableCell>
                    <span className={stock.quantity < 10 ? "text-destructive font-bold" : ""}>
                      {stock.quantity}
                    </span>
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
                  {isAdmin && (
                    <TableCell>
                      <ProductActions variantId={variant?.id} productName={variant?.products?.brands?.name || "Product"} />
                    </TableCell>
                  )}
                </TableRow>
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

function ProductActions({ variantId, productName }: { variantId?: string, productName: string }) {
  const handleEdit = async () => {
    if (!variantId) return
    
    try {
      // Get the product_id from the variant
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("product_id")
        .eq("id", variantId)
        .single()

      if (variantError || !variant) {
        toast.error("Failed to find product")
        return
      }

      // Navigate to product detail page
      window.location.href = `/products/${variant.product_id}`
    } catch (error) {
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
        .eq("product_id", variant.product_id)
        .limit(1)

      // If no other variants, delete the product too
      if (!otherVariants || otherVariants.length === 0) {
        await supabase
          .from("products")
          .delete()
          .eq("id", variant.product_id)
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
      >
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  )
}

