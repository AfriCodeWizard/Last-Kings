import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, AlertTriangle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RevenueCharts } from "@/components/reports/revenue-charts"

export default async function ReportsPage() {
  const user = await getCurrentUser()
  
  // Redirect staff users - they don't have access to reports
  if (user?.role === 'staff') {
    redirect('/dashboard')
  }
  
  const supabase = await createClient()

  // Get sales data for the last 12 months
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data: allSales } = await supabase
    .from("sales")
    .select(`
      *,
      sale_items(
        quantity,
        unit_price,
        product_variants(
          cost
        )
      )
    `)
    .gte("created_at", twelveMonthsAgo.toISOString())
    .order("created_at", { ascending: false })

  // Sales report (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sales = allSales?.filter(s => new Date(s.created_at) >= thirtyDaysAgo) || []
  const totalSales = sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0

  // Calculate monthly data for charts
  const monthlyDataMap = new Map<string, { revenue: number; cost: number; transactions: number }>()
  
  // Initialize all 12 months
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - (11 - i))
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
    monthlyDataMap.set(monthKey, { revenue: 0, cost: 0, transactions: 0 })
  }

  // Process all sales data
  let totalRevenue = 0
  let totalCost = 0
  let totalTransactions = 0
  const paymentMethodMap = new Map<string, number>()

  if (allSales) {
    allSales.forEach((sale: any) => {
      const saleDate = new Date(sale.created_at)
      const monthKey = `${monthNames[saleDate.getMonth()]} ${saleDate.getFullYear()}`
      
      const monthData = monthlyDataMap.get(monthKey)
      if (monthData) {
        monthData.revenue += sale.total_amount || 0
        monthData.transactions += 1
        
        // Calculate cost from sale items
        let saleCost = 0
        if (sale.sale_items) {
          sale.sale_items.forEach((item: any) => {
            const variant = Array.isArray(item.product_variants) 
              ? item.product_variants[0] 
              : item.product_variants
            const cost = variant?.cost || 0
            saleCost += cost * (item.quantity || 0)
          })
        }
        monthData.cost += saleCost
        totalCost += saleCost
      }
      
      totalRevenue += sale.total_amount || 0
      totalTransactions += 1
      
      // Track payment methods
      const paymentMethod = sale.payment_method || 'unknown'
      paymentMethodMap.set(paymentMethod, (paymentMethodMap.get(paymentMethod) || 0) + (sale.total_amount || 0))
    })
  }

  // Convert to array format
  const monthlyData = Array.from(monthlyDataMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    cost: data.cost,
    profit: data.revenue - data.cost,
    transactions: data.transactions,
  }))

  // Payment method data
  const paymentMethodData = [
    { name: 'Cash', value: paymentMethodMap.get('cash') || 0, color: '#D4AF37' },
    { name: 'M-Pesa', value: paymentMethodMap.get('mpesa') || 0, color: '#10b981' },
  ].filter(p => p.value > 0)

  const totalProfit = totalRevenue - totalCost
  const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  // Sales by category (unused for now)
  // const { data: salesByCategory } = await supabase
  //   .from("sale_items")
  //   .select(`
  //     quantity,
  //     unit_price,
  //     product_variants!inner(
  //       products!inner(
  //         categories!inner(name)
  //       )
  //     )
  //   `)
  //   .gte("created_at", thirtyDaysAgo.toISOString())

  // Dead stock (items with no sales in 60 days AND have been in system for at least 60 days)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  // Get variants that have been sold in the last 60 days
  const { data: recentSales } = await supabase
    .from("sale_items")
    .select("variant_id")
    .gte("created_at", sixtyDaysAgo.toISOString())

  const soldVariantIds = new Set(recentSales?.map((s) => s.variant_id) || [])

  // Get all stock with their first receiving transaction date
  const { data: allStock } = await supabase
    .from("stock_levels")
    .select(`
      variant_id,
      quantity,
      updated_at,
      product_variants!inner(
        id,
        size_ml,
        products!inner(
          brands(name)
        )
      )
    `)
    .gt("quantity", 0)

  // Get first receiving transaction for each variant to determine when it was first added
  const variantIds = allStock?.map((s) => s.variant_id) || []
  const { data: firstReceivings } = variantIds.length > 0
    ? await supabase
        .from("inventory_transactions")
        .select("variant_id, created_at")
        .eq("transaction_type", "receiving")
        .in("variant_id", variantIds)
        .order("created_at", { ascending: true })
    : { data: null }

  // Create a map of variant_id to first receiving date
  const firstReceivingMap = new Map<string, Date>()
  if (firstReceivings) {
    firstReceivings.forEach((tr: { variant_id: string; created_at: string }) => {
      if (!firstReceivingMap.has(tr.variant_id)) {
        firstReceivingMap.set(tr.variant_id, new Date(tr.created_at))
      }
    })
  }

  // Filter to only items that:
  // 1. Have stock > 0
  // 2. Haven't been sold in the last 60 days
  // 3. Have been in the system for at least 60 days (first receiving was 60+ days ago)
  const deadStock = allStock?.filter((s) => {
    if (s.quantity <= 0 || soldVariantIds.has(s.variant_id)) {
      return false
    }
    
    // Check if item has been in system for at least 60 days
    const firstReceiving = firstReceivingMap.get(s.variant_id)
    if (!firstReceiving) {
      // If no receiving transaction found, use updated_at as fallback
      const stockDate = new Date(s.updated_at)
      return stockDate < sixtyDaysAgo
    }
    
    return firstReceiving < sixtyDaysAgo
  }) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">Reports</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Sales analytics and reporting</p>
      </div>

      {/* Revenue Charts Section */}
      <RevenueCharts
        monthlyData={monthlyData}
        paymentMethodData={paymentMethodData}
        totalRevenue={totalRevenue}
        totalProfit={totalProfit}
        totalCost={totalCost}
        totalTransactions={totalTransactions}
        averageTransactionValue={averageTransactionValue}
      />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gold break-words overflow-hidden text-ellipsis min-w-0">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">{sales?.length || 0} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadStock.length}</div>
            <p className="text-xs text-muted-foreground">No sales in 60d</p>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Recent Sales</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Sale #</TableHead>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                  <TableHead className="text-xs sm:text-sm">Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales && sales.slice(0, 10).map((sale: {
                  id: string
                  sale_number: string
                  created_at: string
                  total_amount: number
                  payment_method: string
                }) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{sale.sale_number}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{formatDate(sale.created_at)}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{formatCurrency(sale.total_amount)}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{sale.payment_method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

