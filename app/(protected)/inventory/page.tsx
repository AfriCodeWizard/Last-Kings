import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Warehouse, ArrowRightLeft, ClipboardList } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: stockLevels } = await supabase
    .from("stock_levels")
    .select(`
      *,
      product_variants!inner(
        id,
        size_ml,
        sku,
        products!inner(name, brands(name))
      ),
      inventory_locations(name, type)
    `)
    .order("quantity", { ascending: true })

  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("*")
    .order("name")

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-bold text-gold mb-2">Inventory</h1>
          <p className="text-muted-foreground">Manage stock levels and locations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/transfer">
            <Button variant="outline">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          </Link>
          <Link href="/inventory/cycle-count">
            <Button variant="outline">
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
                {stockLevels?.filter((s: { inventory_locations: { id: string } }) => 
                  s.inventory_locations.id === location.id
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
          <CardDescription>Current inventory across all locations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockLevels && stockLevels.length > 0 ? (
                stockLevels.map((stock: {
                  id: string
                  quantity: number
                  lot_number: string | null
                  product_variants: {
                    sku: string
                    size_ml: number
                    products: { name: string }
                  }
                  inventory_locations: { name: string }
                }) => (
                  <TableRow key={stock.id}>
                    <TableCell className="font-medium">
                      {stock.product_variants.products.name}
                    </TableCell>
                    <TableCell>{stock.product_variants.sku}</TableCell>
                    <TableCell>{stock.product_variants.size_ml}ml</TableCell>
                    <TableCell>{stock.inventory_locations.name}</TableCell>
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No stock levels found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

