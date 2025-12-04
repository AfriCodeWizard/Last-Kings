import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

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
        products!inner(name)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-gold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.full_name || user?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold">{formatCurrency(salesTotal)}</div>
            <p className="text-xs text-muted-foreground">+12.5% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStock?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receiving Queue</CardTitle>
            <Package className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receivingQueue?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pending receiving sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Movers</CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topMovers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Best sellers this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Items that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock && lowStock.length > 0 ? (
              <div className="space-y-2">
                {lowStock.map((item: any, idx: number) => {
                  const variant = Array.isArray(item.product_variants) 
                    ? item.product_variants[0] 
                    : item.product_variants
                  const products = variant?.products
                  const productName = products 
                    ? (Array.isArray(products) ? products[0]?.name : (products as any)?.name)
                    : 'Unknown Product'
                  const sku = variant?.sku || 'N/A'
                  
                  return (
                    <div key={idx} className="flex justify-between items-center p-2 rounded border border-gold/10">
                      <span className="text-sm">{productName} ({sku})</span>
                      <span className="text-sm text-destructive">Qty: {item.quantity}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All items are well stocked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receiving Queue</CardTitle>
            <CardDescription>Pending receiving sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {receivingQueue && receivingQueue.length > 0 ? (
              <div className="space-y-2">
                {receivingQueue.map((session: { id: string; created_at: string }) => (
                  <div key={session.id} className="flex justify-between items-center p-2 rounded border border-gold/10">
                    <span className="text-sm">Session {session.id.slice(0, 8)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending receiving sessions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

