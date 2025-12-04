import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Crown } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("total_spent", { ascending: false })

  const whales = customers?.filter((c) => c.is_whale) || []

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Customers</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage customer profiles and allocations</p>
        </div>
        <Link href="/customers/new">
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {whales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-gold" />
              Whale List
            </CardTitle>
            <CardDescription>VIP customers eligible for rare bottle allocations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {whales.map((whale: {
                id: string
                first_name: string
                last_name: string
                total_spent: number
                email: string | null
              }) => (
                <div
                  key={whale.id}
                  className="p-4 rounded-lg border border-gold/30 bg-gold/5"
                >
                  <div className="font-semibold text-gold">
                    {whale.first_name} {whale.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(whale.total_spent)} lifetime
                  </div>
                  {whale.email && (
                    <div className="text-xs text-muted-foreground mt-1">{whale.email}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>Complete customer database</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers && customers.length > 0 ? (
                customers.map((customer: {
                  id: string
                  first_name: string
                  last_name: string
                  email: string | null
                  phone: string | null
                  total_spent: number
                  is_whale: boolean
                }) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.first_name} {customer.last_name}
                    </TableCell>
                    <TableCell>{customer.email || "-"}</TableCell>
                    <TableCell>{customer.phone || "-"}</TableCell>
                    <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                    <TableCell>
                      {customer.is_whale ? (
                        <Badge variant="default">
                          <Crown className="mr-1 h-3 w-3" />
                          Whale
                        </Badge>
                      ) : (
                        <Badge variant="outline">Regular</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No customers found
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

