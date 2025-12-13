import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, TrendingUp, DollarSign, TrendingDown, Warehouse, Sunrise, Sunset, Clock } from "lucide-react"
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
import { DailySnapshotsRefresh } from "@/components/dashboard/daily-snapshots-refresh"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  // Show blank dashboard for unapproved users (except admin)
  if (user && !user.is_approved && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-sans text-gold">Account Pending Approval</CardTitle>
            <CardDescription className="mt-4">
              Your account is waiting for admin approval. You will be able to access the dashboard once an administrator approves your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }
  
  const supabase = await createClient()

  // Get today's sales and yesterday's sales in parallel
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterdayStart = new Date(today)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  
  const [salesTodayResult, salesYesterdayResult] = await Promise.all([
    supabase
      .from("sales")
      .select("total_amount, payment_method")
      .gte("created_at", today.toISOString()),
    supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", today.toISOString())
  ])

  // Calculate today's sales by payment method
  const salesToday = salesTodayResult.data || []
  const salesTotal = salesToday.reduce((sum, sale) => sum + sale.total_amount, 0)
  const cashSales = salesToday
    .filter(sale => sale.payment_method === 'cash')
    .reduce((sum, sale) => sum + sale.total_amount, 0)
  const mpesaSales = salesToday
    .filter(sale => sale.payment_method === 'mpesa')
    .reduce((sum, sale) => sum + sale.total_amount, 0)
  
  const salesYesterdayTotal = salesYesterdayResult.data?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
  
  // Get all-time sales for the top card
  const { data: allTimeSalesResult } = await supabase
    .from("sales")
    .select("total_amount")
  
  const allTimeSalesTotal = allTimeSalesResult?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
  
  // Calculate percentage change
  let salesPercentageChange = 0
  if (salesYesterdayTotal > 0) {
    salesPercentageChange = ((salesTotal - salesYesterdayTotal) / salesYesterdayTotal) * 100
  } else if (salesTotal > 0) {
    salesPercentageChange = 100 // 100% increase if no sales yesterday
  }

  // Get low stock items from main floor only
  const { data: floorLocation } = await supabase
    .from("inventory_locations")
    .select("id")
    .eq("type", "floor")
    .limit(1)
    .single()

  const floorLocationId = floorLocation?.id

  // Get low stock items with size (only from main floor)
  const { data: lowStock } = floorLocationId
    ? await supabase
        .from("stock_levels")
        .select(`
          quantity,
          location_id,
          product_variants!inner(
            id,
            sku,
            size_ml,
            products!inner(
              brands(name)
            )
          )
        `)
        .eq("location_id", floorLocationId)
        .lt("quantity", 10)
        .limit(10)
    : { data: null }

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
            brands(name),
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

  // Get top movers (brands with most sales in last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: saleItems } = await supabase
    .from("sale_items")
    .select(`
      quantity,
      unit_price,
      product_variants!inner(
        products!inner(
          brands(name)
        )
      )
    `)
    .gte("created_at", sevenDaysAgo.toISOString())

  // Calculate sales by brand
  const salesByBrand: Record<string, number> = {}
  if (saleItems) {
    saleItems.forEach((item: any) => {
      const variant = Array.isArray(item.product_variants) 
        ? item.product_variants[0] 
        : item.product_variants
      const products = variant?.products
      
      // Extract brand name - brands is a direct relationship on products
      let brandName = 'Unknown'
      if (products) {
        if (Array.isArray(products)) {
          const product = products[0]
          if (product?.brands) {
            brandName = Array.isArray(product.brands) 
              ? product.brands[0]?.name || 'Unknown'
              : product.brands?.name || 'Unknown'
          }
        } else {
          brandName = (products as any)?.brands?.name || 'Unknown'
        }
      }
      
      const salesAmount = item.quantity * item.unit_price
      salesByBrand[brandName] = (salesByBrand[brandName] || 0) + salesAmount
    })
  }

  // Get top moving brand
  const topMovingBrand = Object.entries(salesByBrand)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]
  
  const topBrandName = topMovingBrand ? topMovingBrand[0] : null

  // Get daily stock snapshots - sales data for all users, stock values for admin only
  const todayDateString = new Date().toISOString().split('T')[0]
  
  // Use the same today date range as defined earlier for consistency
  // Get first and last sale of the day directly from sales table (most accurate)
  const [firstSaleResult, lastSaleResult] = await Promise.all([
    supabase
      .from("sales")
      .select("total_amount, created_at, sale_number")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sales")
      .select("total_amount, created_at, sale_number")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const firstSale = firstSaleResult.data
  const lastSale = lastSaleResult.data
  
  // Get all locations first
  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("id, name, type")
    .order("name")

  // Get existing snapshots - all users can see sales data
  const { data: snapshots } = await supabase
    .from("daily_stock_snapshots")
    .select(`
      *,
      inventory_locations(id, name, type)
    `)
    .eq("snapshot_date", todayDateString)

  let dailySnapshots: any[] = snapshots || []
  
  // Use actual first and last sale amounts from sales table (more accurate than snapshots)
  const openingSalesAmount = firstSale?.total_amount || 0
  const closingSalesAmount = lastSale?.total_amount || 0

  // If snapshots don't exist for all locations, create them (admin can trigger this)
  if (user?.role === 'admin' && locations && locations.length > 0) {
    const locationIds = new Set(snapshots?.map((s: any) => s.location_id) || [])
    const missingLocations = locations.filter(loc => !locationIds.has(loc.id))

    if (missingLocations.length > 0) {
      // Create snapshots for missing locations
      await Promise.all(
        missingLocations.map(async (location) => {
            try {
              await supabase.rpc('create_daily_snapshot', {
                p_date: todayDateString,
                p_location_id: location.id
              })
          } catch (error) {
            console.error(`Error creating snapshot for location ${location.id}:`, error)
          }
        })
      )

        // Fetch updated snapshots
        const { data: updatedSnapshots } = await supabase
          .from("daily_stock_snapshots")
          .select(`
            *,
            inventory_locations(id, name, type)
          `)
          .eq("snapshot_date", todayDateString)

      dailySnapshots = updatedSnapshots || []
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground font-sans">Welcome back, {user?.full_name || user?.email}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">All Time Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold font-sans text-gold break-words overflow-hidden text-ellipsis">{formatCurrency(allTimeSalesTotal)}</div>
            <p className="text-xs text-muted-foreground font-sans mt-1">Total revenue since system start</p>
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
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-green-500">{topBrandName || 'N/A'}</div>
            <p className="text-xs text-muted-foreground font-sans">Best selling brand this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="font-sans">Low Stock Items</CardTitle>
            <CardDescription className="font-sans">Items that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {lowStock && lowStock.length > 0 ? (
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-sans whitespace-nowrap">Brand Name</TableHead>
                      <TableHead className="font-sans whitespace-nowrap">Size</TableHead>
                      <TableHead className="text-right font-sans whitespace-nowrap">Stock</TableHead>
                      <TableHead className="text-right font-sans whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((item: any, idx: number) => {
                      const variant = Array.isArray(item.product_variants) 
                        ? item.product_variants[0] 
                        : item.product_variants
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
                      const sizeMl = variant?.size_ml || 0
                      
                      const quantity = item.quantity
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-sans whitespace-nowrap">{brandName}</TableCell>
                          <TableCell className="font-sans whitespace-nowrap">{sizeMl}ml</TableCell>
                          <TableCell className="text-right font-sans whitespace-nowrap">{quantity}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {quantity < 5 ? (
                              <Badge variant="destructive" className="font-sans">Low Stock</Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-sans">Medium Stock</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">All items are well stocked</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="font-sans">Pending Receivables Queue</CardTitle>
            <CardDescription className="font-sans">Items awaiting receipt from purchase orders</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {pendingPOItems && pendingPOItems.length > 0 ? (
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-sans whitespace-nowrap">Brand Name</TableHead>
                      <TableHead className="text-right font-sans whitespace-nowrap">Qty Expected</TableHead>
                      <TableHead className="text-right font-sans whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPOItems.map((item: any) => {
                      const products = item.product_variants?.products
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
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-sans whitespace-nowrap">{brandName}</TableCell>
                          <TableCell className="text-right font-sans whitespace-nowrap">{item.remainingQty}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-sans">Processing</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">No pending receivables</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Overview - Available to all users */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Opening Sales Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium font-sans text-muted-foreground">
                Opening Sales
              </CardTitle>
              <Sunrise className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold font-sans text-blue-500">
                {formatCurrency(openingSalesAmount)}
              </div>
              {firstSale ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(firstSale.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-sans">No sales yet today</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Sales Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-gold bg-gradient-to-br from-gold/10 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium font-sans text-muted-foreground">
                Total Sales Today
              </CardTitle>
              <DollarSign className="h-5 w-5 text-gold" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold font-sans text-gold">
                {formatCurrency(salesTotal)}
              </div>
              
              {/* Cash and M-Pesa breakdown */}
              <div className="space-y-1.5 pt-2 border-t border-gold/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-sans">Cash:</span>
                  <span className="font-semibold font-sans text-gold">{formatCurrency(cashSales)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-sans">M-Pesa:</span>
                  <span className="font-semibold font-sans text-green-500">{formatCurrency(mpesaSales)}</span>
                </div>
              </div>

              {/* Yesterday comparison */}
              <div className="pt-2 border-t border-gold/20 space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                  {salesPercentageChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={salesPercentageChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {salesPercentageChange >= 0 ? '+' : ''}{salesPercentageChange.toFixed(1)}% from yesterday
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-sans">
                  Yesterday: {formatCurrency(salesYesterdayTotal)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Closing Sales Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium font-sans text-muted-foreground">
                Closing Sales
              </CardTitle>
              <Sunset className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold font-sans text-purple-500">
                {formatCurrency(closingSalesAmount)}
              </div>
              {lastSale ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(lastSale.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-sans">No sales recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin refresh button for sales section */}
      {user?.role === 'admin' && (
        <div className="flex justify-end">
          <DailySnapshotsRefresh />
        </div>
      )}

      {/* Admin Only: Daily Stock Values Overview */}
      {user?.role === 'admin' && dailySnapshots.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="font-sans flex items-center gap-2 text-lg sm:text-xl">
                  <Warehouse className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
                  Daily Stock Values Overview
                </CardTitle>
                <CardDescription className="font-sans text-xs sm:text-sm mt-1">
                  Opening and closing stock values for all locations today (Admin Only)
                </CardDescription>
              </div>
              <div className="flex-shrink-0">
                <DailySnapshotsRefresh />
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-sans whitespace-nowrap text-xs sm:text-sm">Location</TableHead>
                    <TableHead className="text-right font-sans whitespace-nowrap text-xs sm:text-sm">Opening</TableHead>
                    <TableHead className="text-right font-sans whitespace-nowrap text-xs sm:text-sm">Closing</TableHead>
                    <TableHead className="text-right font-sans whitespace-nowrap text-xs sm:text-sm">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySnapshots.map((snapshot: any) => {
                    const location = Array.isArray(snapshot.inventory_locations)
                      ? snapshot.inventory_locations[0]
                      : snapshot.inventory_locations
                    const locationName = location?.name || 'Unknown Location'
                    const stockChange = (snapshot.closing_stock_value || 0) - (snapshot.opening_stock_value || 0)
                    const stockChangePercent = snapshot.opening_stock_value > 0
                      ? ((stockChange / snapshot.opening_stock_value) * 100).toFixed(2)
                      : '0.00'

                    return (
                      <TableRow key={snapshot.id}>
                        <TableCell className="font-sans whitespace-nowrap text-xs sm:text-sm">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{locationName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-sans whitespace-nowrap text-xs sm:text-sm">
                          <span className="block sm:inline">{formatCurrency(snapshot.opening_stock_value || 0)}</span>
                        </TableCell>
                        <TableCell className="text-right font-sans whitespace-nowrap text-xs sm:text-sm">
                          <span className="block sm:inline">{formatCurrency(snapshot.closing_stock_value || 0)}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">
                          <div className="flex items-center justify-end gap-1 flex-wrap sm:flex-nowrap">
                            {stockChange >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                            )}
                            <span className={`font-sans ${stockChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(Math.abs(stockChange))}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({stockChangePercent}%)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

