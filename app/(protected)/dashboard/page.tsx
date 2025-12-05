import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  // Get low stock items with categories
  const { data: lowStock } = await supabase
    .from("stock_levels")
    .select(`
      quantity,
      product_variants!inner(
        id,
        sku,
        products!inner(
          name,
          categories(name)
        )
      )
    `)
    .lt("quantity", 10)
    .limit(10)

  // Get pending receivables - PO items from purchase orders with status 'sent'
  const { data: pendingPOs } = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("status", "sent")

  const poIds = pendingPOs?.map(po => po.id) || []

  // Get all PO items from pending purchase orders
  let pendingPOItems: any[] = []
  let totalPendingQuantity = 0

  if (poIds.length > 0) {
    const { data: allPOItems } = await supabase
      .from("po_items")
      .select(`
        id,
        po_id,
        variant_id,
        quantity,
        product_variants!inner(
          products!inner(
            name,
            categories(name)
          )
        )
      `)
      .in("po_id", poIds)

    if (allPOItems) {
      // Get all receiving sessions for these POs
      const { data: receivingSessions } = await supabase
        .from("receiving_sessions")
        .select("id, po_id")
        .in("po_id", poIds)
        .eq("status", "completed")

      const sessionIds = receivingSessions?.map(s => s.id) || []

      // Get all received items
      let receivedItems: any[] = []
      if (sessionIds.length > 0) {
        const { data: received } = await supabase
          .from("received_items")
          .select("variant_id, quantity, session_id")
          .in("session_id", sessionIds)

        receivedItems = received || []
      }

      // Calculate received quantities per variant per PO
      const receivedByPOAndVariant: Record<string, Record<string, number>> = {}
      receivedItems.forEach((item: any) => {
        const session = receivingSessions?.find(s => s.id === item.session_id)
        if (session) {
          if (!receivedByPOAndVariant[session.po_id]) {
            receivedByPOAndVariant[session.po_id] = {}
          }
          receivedByPOAndVariant[session.po_id][item.variant_id] = 
            (receivedByPOAndVariant[session.po_id][item.variant_id] || 0) + item.quantity
        }
      })

      // Filter and calculate status for each PO item
      pendingPOItems = allPOItems
        .map((poItem: any) => {
          const receivedQty = receivedByPOAndVariant[poItem.po_id]?.[poItem.variant_id] || 0
          const remainingQty = poItem.quantity - receivedQty
          
          return {
            ...poItem,
            receivedQty,
            remainingQty,
            status: remainingQty > 0 ? 'processing' : 'completed'
          }
        })
        .filter((item: any) => item.status === 'processing')
        .slice(0, 10) // Limit to 10 items for display

      // Calculate total pending quantity
      totalPendingQuantity = pendingPOItems.reduce((sum, item) => sum + item.remainingQty, 0)
    }
  }

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
            <div className="text-2xl font-bold font-sans">{totalPendingQuantity || 0}</div>
            <p className="text-xs text-muted-foreground font-sans">Items awaiting receipt</p>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-sans">Product Name</TableHead>
                    <TableHead className="font-sans">Category</TableHead>
                    <TableHead className="text-right font-sans">Current Stock</TableHead>
                    <TableHead className="text-right font-sans">Status</TableHead>
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
                    const category = products 
                      ? (Array.isArray(products) 
                          ? (products[0]?.categories 
                              ? (Array.isArray(products[0].categories) 
                                  ? products[0].categories[0]?.name 
                                  : products[0].categories?.name)
                              : 'N/A')
                          : (products?.categories
                              ? (Array.isArray(products.categories)
                                  ? products.categories[0]?.name
                                  : products.categories?.name)
                              : 'N/A'))
                      : 'N/A'
                    
                    const quantity = item.quantity
                    const status = quantity < 5 ? 'Low Stock' : quantity < 10 ? 'Medium Stock' : 'In Stock'
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-sans">{productName}</TableCell>
                        <TableCell className="font-sans">{category}</TableCell>
                        <TableCell className="text-right font-sans">{quantity}</TableCell>
                        <TableCell className="text-right">
                          {quantity < 5 ? (
                            <Badge variant="destructive" className="font-sans">Low Stock</Badge>
                          ) : quantity < 10 ? (
                            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-sans">Medium Stock</Badge>
                          ) : (
                            <Badge variant="default" className="font-sans">In Stock</Badge>
                          )}
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

        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Pending Receivables Queue</CardTitle>
            <CardDescription className="font-sans">Items awaiting receipt from purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPOItems && pendingPOItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-sans">Product Name</TableHead>
                    <TableHead className="font-sans">Category</TableHead>
                    <TableHead className="text-right font-sans">Quantity Expected</TableHead>
                    <TableHead className="text-right font-sans">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPOItems.map((item: any) => {
                    const products = item.product_variants?.products
                    const productName = products 
                      ? (Array.isArray(products) ? products[0]?.name : products?.name)
                      : 'Unknown Product'
                    const category = products 
                      ? (Array.isArray(products) 
                          ? (products[0]?.categories 
                              ? (Array.isArray(products[0].categories) 
                                  ? products[0].categories[0]?.name 
                                  : products[0].categories?.name)
                              : 'N/A')
                          : (products?.categories
                              ? (Array.isArray(products.categories)
                                  ? products.categories[0]?.name
                                  : products.categories?.name)
                              : 'N/A'))
                      : 'N/A'
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-sans">{productName}</TableCell>
                        <TableCell className="font-sans">{category}</TableCell>
                        <TableCell className="text-right font-sans">{item.remainingQty}</TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-sans">Processing</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">No pending receivables</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

