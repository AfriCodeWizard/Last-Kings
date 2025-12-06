import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, TrendingUp, AlertTriangle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function ReportsPage() {
  const user = await getCurrentUser()
  
  // Redirect staff users - they don't have access to reports
  if (user?.role === 'staff') {
    redirect('/dashboard')
  }
  
  const supabase = await createClient()

  // Sales report (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: sales } = await supabase
    .from("sales")
    .select("*")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })

  const totalSales = sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0

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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gold break-words overflow-hidden text-ellipsis">{formatCurrency(totalSales)}</div>
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
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

        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Dead Stock Alert</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Items with no sales in 60 days</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {deadStock.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {deadStock.slice(0, 10).map((stock: any) => {
                  const variant = Array.isArray(stock.product_variants) 
                    ? stock.product_variants[0] 
                    : stock.product_variants
                  const products = variant?.products
                  const brandName = products 
                    ? (Array.isArray(products) 
                        ? (products[0]?.brands 
                            ? (Array.isArray(products[0].brands) 
                                ? products[0].brands[0]?.name 
                                : products[0].brands?.name)
                            : 'Unknown Product')
                        : (products?.brands
                            ? (Array.isArray(products.brands)
                                ? products.brands[0]?.name
                                : products.brands?.name)
                            : 'Unknown Product'))
                    : 'Unknown Product'
                  const sizeMl = variant?.size_ml || 0
                  
                  return (
                    <div
                      key={stock.variant_id}
                      className="flex justify-between items-center p-2 rounded border border-destructive/20 text-xs sm:text-sm"
                    >
                      <div className="flex-1 truncate mr-2">
                        <div className="font-medium">{brandName}</div>
                        <div className="text-muted-foreground text-xs">{sizeMl}ml</div>
                      </div>
                      <div className="text-destructive font-bold whitespace-nowrap">
                        Qty: {stock.quantity}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No dead stock items
              </p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

