import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Receipt } from "lucide-react"
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

export default async function OpenTabPage() {
  const supabase = await createClient()

  const { data: tabs } = await supabase
    .from("tabs")
    .select("*")
    .order("created_at", { ascending: false })

  const openTabs = tabs?.filter((t) => t.status === "open") || []
  const closedTabs = tabs?.filter((t) => t.status === "closed") || []

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Open Tab</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage customer tabs and payments</p>
        </div>
        <Link href="/open-tab/new" prefetch={true}>
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Open New Tab
          </Button>
        </Link>
      </div>

      {openTabs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gold" />
              Open Tabs ({openTabs.length})
            </CardTitle>
            <CardDescription>Active customer tabs awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTabs.map((tab: {
                  id: string
                  customer_name: string
                  phone: string | null
                  total_amount: number
                  created_at: string
                }) => (
                  <TableRow key={tab.id}>
                    <TableCell className="font-medium">
                      {tab.customer_name}
                    </TableCell>
                    <TableCell>{tab.phone || "-"}</TableCell>
                    <TableCell className="font-semibold text-gold">
                      {formatCurrency(tab.total_amount)}
                    </TableCell>
                    <TableCell>
                      {new Date(tab.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/open-tab/${tab.id}`}>
                        <Button variant="ghost" size="sm">View / Cash Out</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {openTabs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No open tabs. Create a new tab to get started.</p>
          </CardContent>
        </Card>
      )}

      {closedTabs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Closed Tabs</CardTitle>
            <CardDescription>Recently closed customer tabs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedTabs.slice(0, 10).map((tab: {
                  id: string
                  customer_name: string
                  phone: string | null
                  total_amount: number
                  closed_at: string | null
                }) => (
                  <TableRow key={tab.id}>
                    <TableCell className="font-medium">
                      {tab.customer_name}
                    </TableCell>
                    <TableCell>{tab.phone || "-"}</TableCell>
                    <TableCell>{formatCurrency(tab.total_amount)}</TableCell>
                    <TableCell>
                      {tab.closed_at ? new Date(tab.closed_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Closed</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

