import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Receipt, Coins, CreditCard } from "lucide-react"

export default async function TransactionsPage() {
  const supabase = await createClient()

  // Get all sales with sale items and product details
  const { data: sales } = await supabase
    .from("sales")
    .select(`
      *,
      sale_items(
        id,
        quantity,
        unit_price,
        product_variants(
          id,
          size_ml,
          sku,
          products(
            brands(name),
            categories(name)
          )
        )
      ),
      users!sales_sold_by_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">Transaction History</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Detailed record of all sales transactions</p>
      </div>

      <div className="space-y-4">
        {sales && sales.length > 0 ? (
          sales.map((sale: any) => {
            const saleItems = sale.sale_items || []
            const hasChange = sale.payment_method === 'cash' && sale.change_given && sale.change_given > 0

            return (
              <Card key={sale.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1 w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Receipt className="h-5 w-5 text-gold flex-shrink-0" />
                        <CardTitle className="text-lg sm:text-xl truncate">
                          {sale.sale_number}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {sale.payment_method === 'cash' ? (
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              Cash
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              M-Pesa
                            </span>
                          )}
                        </Badge>
                        {hasChange && (
                          <Badge variant="default" className="text-xs bg-gold text-black whitespace-nowrap">
                            Change: {formatCurrency(sale.change_given)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span className="whitespace-nowrap">{formatDate(sale.created_at)}</span>
                        {sale.users && (
                          <span className="truncate">Sold by: {sale.users.full_name || sale.users.email}</span>
                        )}
                        <span className="font-semibold text-gold whitespace-nowrap">
                          Total: {formatCurrency(sale.total_amount)}
                        </span>
                        {sale.payment_method === 'cash' && sale.received_amount && (
                          <span className="whitespace-nowrap">
                            Received: {formatCurrency(sale.received_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] sm:min-w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Product</TableHead>
                            <TableHead className="text-xs sm:text-sm">Size</TableHead>
                            <TableHead className="text-xs sm:text-sm text-right">Quantity</TableHead>
                            <TableHead className="text-xs sm:text-sm text-right">Unit Price</TableHead>
                            <TableHead className="text-xs sm:text-sm text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleItems.length > 0 ? (
                            saleItems.map((item: any) => {
                              const variant = item.product_variants
                              const product = variant?.products
                              const brandName = product?.brands?.name || 'Unknown'
                              const size = variant?.size_ml === 1000 ? '1L' : `${variant?.size_ml || 0}ml`
                              const subtotal = item.unit_price * item.quantity

                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium text-xs sm:text-sm">
                                    {brandName}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">{size}</TableCell>
                                  <TableCell className="text-right text-xs sm:text-sm">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="text-right text-xs sm:text-sm">
                                    {formatCurrency(item.unit_price)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-xs sm:text-sm">
                                    {formatCurrency(subtotal)}
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground text-xs sm:text-sm">
                                No items found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

