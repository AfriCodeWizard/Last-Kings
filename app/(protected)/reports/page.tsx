import { createClient } from "@/lib/supabase/server"
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
  const totalTax = sales?.reduce((sum, s) => sum + s.tax_amount, 0) || 0
  const totalExcise = sales?.reduce((sum, s) => sum + s.excise_tax, 0) || 0

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

  // Dead stock (items with no sales in 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: recentSales } = await supabase
    .from("sale_items")
    .select("variant_id")
    .gte("created_at", ninetyDaysAgo.toISOString())

  const soldVariantIds = new Set(recentSales?.map((s) => s.variant_id) || [])

  const { data: allStock } = await supabase
    .from("stock_levels")
    .select(`
      variant_id,
      quantity,
      product_variants!inner(
        products!inner(name)
      )
    `)

  const deadStock = allStock?.filter((s) => !soldVariantIds.has(s.variant_id)) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-sans font-bold text-white mb-2">Reports</h1>
        <p className="text-muted-foreground">Sales analytics and tax reporting</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">{sales?.length || 0} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Tax</CardTitle>
            <FileText className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTax)}</div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excise Tax</CardTitle>
            <FileText className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExcise)}</div>
            <p className="text-xs text-muted-foreground">TTB reporting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadStock.length}</div>
            <p className="text-xs text-muted-foreground">No sales in 90d</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
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
                    <TableCell className="font-medium">{sale.sale_number}</TableCell>
                    <TableCell>{formatDate(sale.created_at)}</TableCell>
                    <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                    <TableCell>{sale.payment_method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dead Stock Alert</CardTitle>
            <CardDescription>Items with no sales in 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {deadStock.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {deadStock.slice(0, 10).map((stock: any) => {
                  const variant = Array.isArray(stock.product_variants) 
                    ? stock.product_variants[0] 
                    : stock.product_variants
                  const productName = variant?.products 
                    ? (Array.isArray(variant.products) ? variant.products[0]?.brands?.name : (variant.products as any)?.brands?.name)
                    : 'Unknown Product'
                  
                  return (
                  <div
                    key={stock.variant_id}
                    className="flex justify-between items-center p-2 rounded border border-destructive/20"
                  >
                    <div className="text-sm">
                      {productName}
                    </div>
                    <div className="text-sm text-destructive font-bold">
                      Qty: {stock.quantity}
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No dead stock items
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Reports</CardTitle>
          <CardDescription>Export-ready reports for TTB and state compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Sales Tax Report
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Excise Tax Report
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export TTB Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

