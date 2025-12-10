import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, MessageCircle } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { notFound } from "next/navigation"

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch purchase order with related data
  const { data: purchaseOrder, error: poError } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      distributors(*),
      users!purchase_orders_created_by_fkey(full_name, email)
    `)
    .eq("id", id)
    .single()

  if (poError || !purchaseOrder) {
    notFound()
  }

  // Fetch purchase order items with product details
  const { data: poItems, error: itemsError } = await supabase
    .from("po_items")
    .select(`
      *,
      product_variants(
        id,
        size_ml,
        sku,
        cost,
        price,
        products(
          name,
          product_type,
          brands(name),
          categories(name)
        )
      )
    `)
    .eq("po_id", id)
    .order("created_at", { ascending: true })

  if (itemsError) {
    console.error("Error fetching PO items:", itemsError)
  }

  // Check if there are any receiving sessions for this PO
  const { data: receivingSessions } = await supabase
    .from("receiving_sessions")
    .select(`
      id,
      status,
      created_at,
      completed_at,
      received_by,
      users!receiving_sessions_received_by_fkey(full_name, email)
    `)
    .eq("po_id", id)
    .order("created_at", { ascending: false })

  // Calculate received quantities per variant
  const receivedQuantities: Record<string, number> = {}
  if (receivingSessions && receivingSessions.length > 0) {
    const sessionIds = receivingSessions.map(s => s.id)
    const { data: receivedItems } = await supabase
      .from("received_items")
      .select("variant_id, quantity")
      .in("session_id", sessionIds)

    if (receivedItems) {
      receivedItems.forEach((item: any) => {
        receivedQuantities[item.variant_id] = 
          (receivedQuantities[item.variant_id] || 0) + item.quantity
      })
    }
  }

  const distributor = purchaseOrder.distributors as any
  const createdBy = purchaseOrder.users as any

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchase Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-white mb-2">
              {purchaseOrder.po_number}
            </h1>
            <p className="text-muted-foreground font-sans">
              Purchase Order Details
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={
              purchaseOrder.status === "received"
                ? "default"
                : purchaseOrder.status === "sent"
                ? "secondary"
                : purchaseOrder.status === "cancelled"
                ? "destructive"
                : "outline"
            }
            className="text-sm font-sans"
          >
            {purchaseOrder.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Purchase Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Purchase Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">PO Number:</span>
                <span className="text-sm font-medium font-sans">{purchaseOrder.po_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">Status:</span>
                <Badge
                  variant={
                    purchaseOrder.status === "received"
                      ? "default"
                      : purchaseOrder.status === "sent"
                      ? "secondary"
                      : purchaseOrder.status === "cancelled"
                      ? "destructive"
                      : "outline"
                  }
                  className="text-xs font-sans"
                >
                  {purchaseOrder.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">Total Amount:</span>
                <span className="text-sm font-bold text-gold font-sans">
                  {formatCurrency(purchaseOrder.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">Created By:</span>
                <span className="text-sm font-sans">
                  {createdBy?.full_name || createdBy?.email || "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">Created At:</span>
                <span className="text-sm font-sans">
                  {formatDateTime(purchaseOrder.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">Last Updated:</span>
                <span className="text-sm font-sans">
                  {formatDateTime(purchaseOrder.updated_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distributor Information */}
        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Distributor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">Name:</span>
                <span className="text-sm font-medium font-sans">{distributor?.name || "N/A"}</span>
              </div>
              {distributor?.contact_name && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground font-sans">Contact:</span>
                  <span className="text-sm font-sans">{distributor.contact_name}</span>
                </div>
              )}
              {distributor?.email && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground font-sans">Email:</span>
                  <span className="text-sm font-sans">{distributor.email}</span>
                </div>
              )}
              {distributor?.phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground font-sans">Phone:</span>
                  <span className="text-sm font-sans">{distributor.phone}</span>
                </div>
              )}
            </div>
            {(distributor?.email || distributor?.phone) && (
              <div className="flex gap-2 pt-2 border-t">
                {distributor?.email && (
                  <a
                    href={`mailto:${distributor.email}`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full font-sans"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </a>
                )}
                {distributor?.phone && (
                  <a
                    href={`tel:${distributor.phone}`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full font-sans"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="font-sans">Order Items</CardTitle>
          <CardDescription className="font-sans">
            {poItems?.length || 0} item(s) in this purchase order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {poItems && poItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-sans">Brand</TableHead>
                    <TableHead className="font-sans">Product</TableHead>
                    <TableHead className="font-sans">Size</TableHead>
                    <TableHead className="font-sans">SKU</TableHead>
                    <TableHead className="text-right font-sans">Quantity</TableHead>
                    <TableHead className="text-right font-sans">Unit Cost</TableHead>
                    <TableHead className="text-right font-sans">Subtotal</TableHead>
                    {receivingSessions && receivingSessions.length > 0 && (
                      <TableHead className="text-right font-sans">Received</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.map((item: any) => {
                    const variant = item.product_variants
                    const product = variant?.products
                    const brandName = product?.brands?.name || "Unknown"
                    const productName = product?.name || ""
                    const categoryName = product?.categories?.name || ""
                    const sizeMl = variant?.size_ml || 0
                    const sku = variant?.sku || ""
                    const quantity = item.quantity || 0
                    const unitCost = item.unit_cost || 0
                    const subtotal = quantity * unitCost
                    const receivedQty = receivedQuantities[item.variant_id] || 0
                    const remainingQty = quantity - receivedQty

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium font-sans">{brandName}</TableCell>
                        <TableCell className="font-sans">
                          {productName || categoryName || "N/A"}
                        </TableCell>
                        <TableCell className="font-sans">
                          {sizeMl === 1000 ? "1L" : `${sizeMl}ml`}
                        </TableCell>
                        <TableCell className="font-sans text-muted-foreground">{sku}</TableCell>
                        <TableCell className="text-right font-sans">{quantity}</TableCell>
                        <TableCell className="text-right font-sans">
                          {formatCurrency(unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold font-sans">
                          {formatCurrency(subtotal)}
                        </TableCell>
                        {receivingSessions && receivingSessions.length > 0 && (
                          <TableCell className="text-right font-sans">
                            <div className="flex flex-col items-end gap-1">
                              <span className={receivedQty === quantity ? "text-green-500" : "text-yellow-500"}>
                                {receivedQty}
                              </span>
                              {remainingQty > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({remainingQty} remaining)
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                  <TableRow className="font-bold">
                    <TableCell colSpan={receivingSessions && receivingSessions.length > 0 ? 6 : 6} className="text-right font-sans">
                      Total:
                    </TableCell>
                    <TableCell className="text-right font-bold text-gold font-sans">
                      {formatCurrency(purchaseOrder.total_amount)}
                    </TableCell>
                    {receivingSessions && receivingSessions.length > 0 && (
                      <TableCell></TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-sans text-center py-8">
              No items found in this purchase order
            </p>
          )}
        </CardContent>
      </Card>

      {/* Receiving History */}
      {receivingSessions && receivingSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Receiving History</CardTitle>
            <CardDescription className="font-sans">
              Items received for this purchase order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receivingSessions.map((session: any) => {
                const receivedBy = session.users as any
                return (
                  <div
                    key={session.id}
                    className="p-4 rounded-lg border border-gold/10 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium font-sans">
                          {session.status === "completed" ? "Completed" : "In Progress"}
                        </div>
                        <div className="text-sm text-muted-foreground font-sans">
                          Received by: {receivedBy?.full_name || receivedBy?.email || "Unknown"}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground font-sans">
                        <div>Started: {formatDateTime(session.created_at)}</div>
                        {session.completed_at && (
                          <div>Completed: {formatDateTime(session.completed_at)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

