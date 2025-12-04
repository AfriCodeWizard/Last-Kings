import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()

  const { data: purchaseOrders } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      distributors(name),
      users!purchase_orders_created_by_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-sans font-bold text-white mb-2">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders and suppliers</p>
        </div>
        <Link href="/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
          <CardDescription>View and manage your purchase orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Distributor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders && purchaseOrders.length > 0 ? (
                purchaseOrders.map((po: {
                  id: string
                  po_number: string
                  status: string
                  total_amount: number
                  created_at: string
                  distributors: { name: string }
                  users: { full_name: string | null; email: string }
                }) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.distributors.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        po.status === "received" ? "default" :
                        po.status === "sent" ? "secondary" :
                        po.status === "cancelled" ? "destructive" : "outline"
                      }>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                    <TableCell>{po.users.full_name || po.users.email}</TableCell>
                    <TableCell>{formatDate(po.created_at)}</TableCell>
                    <TableCell>
                      <Link href={`/purchase-orders/${po.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No purchase orders found
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

