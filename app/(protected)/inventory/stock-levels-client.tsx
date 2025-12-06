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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StockLevel {
  id: string
  quantity: number
  lot_number: string | null
  product_variants: {
    sku: string
    size_ml: number
    products: { brands: { name: string } }
  }
}

interface StockLevelsClientProps {
  stockLevels: StockLevel[]
  floorLocationId?: string
  backroomLocationId?: string
  warehouseLocationId?: string
}

export function StockLevelsClient({
  stockLevels,
  floorLocationId,
  backroomLocationId,
  warehouseLocationId,
}: StockLevelsClientProps) {
  const [locationTab, setLocationTab] = useState(floorLocationId || "floor")
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

  const getCurrentStock = () => {
    if (locationTab === floorLocationId) {
      return filterStockByLocationAndType(floorLocationId, productTypeTab)
    } else if (locationTab === backroomLocationId) {
      return filterStockByLocationAndType(backroomLocationId, productTypeTab)
    } else if (locationTab === warehouseLocationId) {
      return filterStockByLocationAndType(warehouseLocationId, productTypeTab)
    }
    return []
  }

  const currentStock = getCurrentStock()

  return (
    <div className="space-y-4">
      <Tabs value={locationTab} onValueChange={setLocationTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value={floorLocationId || "floor"}>Main Floor</TabsTrigger>
          <TabsTrigger value={backroomLocationId || "backroom"}>Backroom</TabsTrigger>
          <TabsTrigger value={warehouseLocationId || "warehouse"}>Warehouse</TabsTrigger>
        </TabsList>

        <TabsContent value={floorLocationId || "floor"} className="mt-4">
          <div className="space-y-4">
            <Tabs value={productTypeTab} onValueChange={(v) => setProductTypeTab(v as "all" | "liquor" | "beverage")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="liquor">Liquor</TabsTrigger>
                <TabsTrigger value="beverage">Beverages</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "all")} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "liquor")} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(floorLocationId, "beverage")} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value={backroomLocationId || "backroom"} className="mt-4">
          <div className="space-y-4">
            <Tabs value={productTypeTab} onValueChange={(v) => setProductTypeTab(v as "all" | "liquor" | "beverage")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="liquor">Liquor</TabsTrigger>
                <TabsTrigger value="beverage">Beverages</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "all")} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "liquor")} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(backroomLocationId, "beverage")} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value={warehouseLocationId || "warehouse"} className="mt-4">
          <div className="space-y-4">
            <Tabs value={productTypeTab} onValueChange={(v) => setProductTypeTab(v as "all" | "liquor" | "beverage")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="liquor">Liquor</TabsTrigger>
                <TabsTrigger value="beverage">Beverages</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "all")} />
              </TabsContent>
              <TabsContent value="liquor" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "liquor")} />
              </TabsContent>
              <TabsContent value="beverage" className="mt-4">
                <StockTable stockLevels={filterStockByLocationAndType(warehouseLocationId, "beverage")} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StockTable({ stockLevels }: { stockLevels: StockLevel[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Lot Number</TableHead>
            <TableHead>Status</TableHead>
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
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No stock levels found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

