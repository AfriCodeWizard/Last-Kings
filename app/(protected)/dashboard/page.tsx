import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Get today's sales
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data: salesToday } = await supabase
    .from("sales")
    .select("total_amount")
    .gte("created_at", today.toISOString())

  const salesTotal = salesToday?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0

  // Get low stock items
  const { data: lowStock } = await supabase
    .from("stock_levels")
    .select(`
      quantity,
      product_variants!inner(
        id,
        sku,
        products!inner(
          name,
          categories!inner(name)
        )
      )
    `)
    .lt("quantity", 10)
    .limit(10)

  // Get pending receiving sessions
  const { data: receivingQueue } = await supabase
    .from("receiving_sessions")
    .select("*")
    .eq("status", "in_progress")
    .limit(5)

  // Get top movers (products with most sales in last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: topMovers } = await supabase
    .from("sale_items")
    .select(`
      quantity,
      product_variants!inner(
        products!inner(name)
      )
    `)
    .gte("created_at", sevenDaysAgo.toISOString())
    .limit(5)

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Dashboard Overview</h1>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-white">{formatCurrency(salesTotal)}</div>
            <p className="text-xs text-green-500 font-sans">+5.2%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Total Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-white">{formatCurrency(850210)}</div>
            <p className="text-xs text-destructive font-sans">-0.8%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Items Sold Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-white">152</div>
            <p className="text-xs text-green-500 font-sans">+12%</p>
          </CardContent>
        </Card>

      </div>

      <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-gold font-sans">Low Stock Alerts</CardTitle>
              <Button className="bg-gold text-black hover:bg-gold/90 font-sans text-sm">Create Purchase Order</Button>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock && lowStock.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-sans">Product Name</TableHead>
                    <TableHead className="font-sans">Category</TableHead>
                    <TableHead className="font-sans">Current Stock</TableHead>
                    <TableHead className="font-sans">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((item: any, idx: number) => {
                    const variant = Array.isArray(item.product_variants) 
                      ? item.product_variants[0] 
                      : item.product_variants
                    const products = variant?.products
                    const productName = products 
                      ? (Array.isArray(products) ? products[0]?.name : (products as any)?.name)
                      : 'Unknown Product'
                    const categoryName = products 
                      ? (Array.isArray(products) ? products[0]?.categories?.name : (products as any)?.categories?.name)
                      : 'Unknown'
                    const quantity = item.quantity
                    const status = quantity < 3 ? 'Low Stock' : quantity < 6 ? 'Medium Stock' : 'Good Stock'
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-sans">{productName}</TableCell>
                        <TableCell className="font-sans">{categoryName}</TableCell>
                        <TableCell className="font-sans">{quantity}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={quantity < 3 ? "destructive" : quantity < 6 ? "default" : "secondary"}
                            className="font-sans"
                          >
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">All items are well stocked</p>
            )}
          </CardContent>
        </Card>
    </div>
  )
}

