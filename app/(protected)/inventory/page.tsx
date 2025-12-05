import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
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
  const user = await getCurrentUser()
  
  // Redirect staff users - they don't have access to inventory
  if (user?.role === 'staff') {
    redirect('/dashboard')
  }
  
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">Inventory</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage stock levels and locations</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/inventory/transfer" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          </Link>
          <Link href="/inventory/cycle-count" className="flex-1 sm:flex-initial">
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

