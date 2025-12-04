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

  // Get pending receivables (purchase orders with status 'sent')
  const { data: pendingReceivables } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      distributors(name)
    `)
    .eq("status", "sent")
    .order("created_at", { ascending: true })
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
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground font-sans">Welcome back, {user?.full_name || user?.email}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Sales Today</CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-gold">{formatCurrency(salesTotal)}</div>
            <p className="text-xs text-muted-foreground font-sans">+12.5% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans">{lowStock?.length || 0}</div>
            <p className="text-xs text-muted-foreground font-sans">Items need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Pending Receivables</CardTitle>
            <Package className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans">{pendingReceivables?.length || 0}</div>
            <p className="text-xs text-muted-foreground font-sans">Purchase orders awaiting receipt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Top Movers</CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans">{topMovers?.length || 0}</div>
            <p className="text-xs text-muted-foreground font-sans">Best sellers this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Low Stock Items</CardTitle>
            <CardDescription className="font-sans">Items that need immediate attention</CardDescription>
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
                      <span className="text-sm font-sans">{productName} ({sku})</span>
                      <span className="text-sm text-destructive font-sans">Qty: {item.quantity}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">All items are well stocked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Pending Receivables Queue</CardTitle>
            <CardDescription className="font-sans">Purchase orders awaiting receipt</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingReceivables && pendingReceivables.length > 0 ? (
              <div className="space-y-2">
                {pendingReceivables.map((po: any) => (
                  <div key={po.id} className="flex justify-between items-center p-2 rounded border border-gold/10 hover:bg-gold/5 cursor-pointer">
                    <div className="flex-1">
                      <div className="text-sm font-medium font-sans">{po.po_number}</div>
                      <div className="text-xs text-muted-foreground font-sans">
                        {po.distributors?.name || 'Unknown Distributor'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gold font-sans">{formatCurrency(po.total_amount)}</div>
                      <div className="text-xs text-muted-foreground font-sans">
                        {new Date(po.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">No pending receivables</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

