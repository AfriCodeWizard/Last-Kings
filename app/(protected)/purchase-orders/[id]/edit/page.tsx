"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { Plus, Mail, MessageCircle, X, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Distributor {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

interface ProductVariant {
  id: string
  size_ml: number
  sku: string
  price: number
  cost: number
  products: {
    name: string
    product_type: string
    brands: { name: string }
    categories: { name: string }
  }
}

interface POItem {
  id?: string
  variant_id: string
  product_type: string
  brand_name: string
  size_ml: number
  sku: string
  quantity: number
  unit_cost: number
  subtotal: number
}

export default function EditPurchaseOrderPage() {
  const params = useParams()
  const router = useRouter()
  const poId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [products, setProducts] = useState<ProductVariant[]>([])
  const [selectedDistributor, setSelectedDistributor] = useState<string>("")
  const [poItems, setPoItems] = useState<POItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [poId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load existing PO
      const { data: po, error: poError } = await ((supabase
        .from("purchase_orders") as any)
        .select("*")
        .eq("id", poId)
        .single())

      if (poError || !po) {
        toast.error("Purchase order not found")
        router.push("/purchase-orders")
        return
      }

      const typedPO = po as { status: string; distributor_id: string }
      if (typedPO.status !== 'draft') {
        toast.error("Only draft purchase orders can be edited")
        router.push(`/purchase-orders/${poId}`)
        return
      }

      setSelectedDistributor(typedPO.distributor_id)

      // Load PO items
      const { data: items, error: itemsError } = await supabase
        .from("po_items")
        .select(`
          id,
          variant_id,
          quantity,
          unit_cost,
          product_variants!inner(
            id,
            size_ml,
            sku,
            cost,
            price,
            products!inner(
              product_type,
              brands!inner(name),
              categories!inner(name)
            )
          )
        `)
        .eq("po_id", poId)

      if (itemsError) {
        console.error("Error loading PO items:", itemsError)
      } else if (items) {
        const formattedItems: POItem[] = items.map((item: any) => {
          const variant = item.product_variants
          const product = variant.products
          return {
            id: item.id,
            variant_id: item.variant_id,
            product_type: product.product_type,
            brand_name: product.brands.name,
            size_ml: variant.size_ml,
            sku: variant.sku,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            subtotal: item.quantity * item.unit_cost,
          }
        })
        setPoItems(formattedItems)
        
        // Initialize quantity inputs
        const inputs: Record<string, string> = {}
        formattedItems.forEach(item => {
          inputs[item.variant_id] = item.quantity.toString()
        })
        setQuantityInputs(inputs)
      }

      // Load distributors
      const { data: distData } = await supabase
        .from("distributors")
        .select("*")
        .order("name")

      if (distData) setDistributors(distData)

      // Load products
      const { data: prodData } = await supabase
        .from("product_variants")
        .select(`
          id,
          size_ml,
          sku,
          price,
          cost,
          products!inner(
            product_type,
            brands!inner(name),
            categories!inner(name)
          )
        `)
        .order("products(product_type)")

      if (prodData) {
        setProducts(prodData as any)
      }

    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Error loading purchase order")
    } finally {
      setLoading(false)
    }
  }

  const updateUnitCost = (variantId: string, newCost: number) => {
    setPoItems(prev =>
      prev.map(item =>
        item.variant_id === variantId
          ? { ...item, unit_cost: newCost, subtotal: item.quantity * newCost }
          : item
      )
    )
  }

  const totalAmount = poItems.reduce((sum, item) => sum + item.subtotal, 0)

  const updatePO = async (status: 'draft' | 'sent' = 'draft') => {
    if (!selectedDistributor) {
      toast.error("Please select a distributor")
      return
    }

    if (poItems.length === 0) {
      toast.error("Please add at least one item to the purchase order")
      return
    }

    setSaving(true)

    try {
      // Update purchase order
      const { error: poError } = await ((supabase
        .from("purchase_orders") as any)
        .update({
          distributor_id: selectedDistributor,
          status,
          total_amount: totalAmount,
        })
        .eq("id", poId))

      if (poError) throw poError

      // Delete existing items
      const { error: deleteError } = await ((supabase
        .from("po_items") as any)
        .delete()
        .eq("po_id", poId))

      if (deleteError) throw deleteError

      // Insert updated items
      const itemsToInsert = poItems.map(item => ({
        po_id: poId,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }))

      const { error: itemsError } = await ((supabase
        .from("po_items") as any)
        .insert(itemsToInsert))

      if (itemsError) throw itemsError

      toast.success(`Purchase order ${status === 'draft' ? 'saved' : 'sent'} successfully!`)
      return { success: true }
    } catch (error: any) {
      console.error("Error updating PO:", error)
      toast.error(`Error updating purchase order: ${error.message}`)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    try {
      await updatePO('draft')
      router.push(`/purchase-orders/${poId}`)
    } catch (error) {
      // Error already handled in updatePO
    }
  }

  const handleSendEmail = async () => {
    const distributor = distributors.find(d => d.id === selectedDistributor)
    if (!distributor?.email) {
      toast.error("Distributor email not found")
      return
    }

    setSending(true)

    try {
      await updatePO('sent')

      const response = await fetch('/api/purchase-orders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId,
          distributorEmail: distributor.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success("Purchase order sent via email!")
      router.push("/purchase-orders")
    } catch (error: any) {
      console.error("Error sending email:", error)
      toast.error(`Error sending email: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleSendWhatsApp = async () => {
    const distributor = distributors.find(d => d.id === selectedDistributor)
    if (!distributor?.phone) {
      toast.error("Distributor phone number not found")
      return
    }

    setSending(true)

    try {
      await updatePO('sent')

      const response = await fetch('/api/purchase-orders/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId,
          distributorPhone: distributor.phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send WhatsApp message')
      }

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank')
        toast.success("Opening WhatsApp... Purchase order ready to send!")
      }
      
      router.push("/purchase-orders")
    } catch (error: any) {
      console.error("Error sending WhatsApp:", error)
      toast.error(`Error sending WhatsApp: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const addProduct = (variant: ProductVariant) => {
    const existing = poItems.find(item => item.variant_id === variant.id)
    if (existing) {
      const newQuantity = existing.quantity + 1
      setPoItems(prev =>
        prev.map(item =>
          item.variant_id === variant.id
            ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unit_cost }
            : item
        )
      )
      setQuantityInputs(prev => ({ ...prev, [variant.id]: newQuantity.toString() }))
    } else {
      const product = variant.products
      const newItem: POItem = {
        variant_id: variant.id,
        product_type: product.product_type,
        brand_name: product.brands.name,
        size_ml: variant.size_ml,
        sku: variant.sku,
        quantity: 1,
        unit_cost: variant.cost || 0,
        subtotal: variant.cost || 0,
      }
      setPoItems([...poItems, newItem])
      setQuantityInputs(prev => ({ ...prev, [variant.id]: "1" }))
    }
  }

  const removeItem = (variantId: string) => {
    setPoItems(prev => prev.filter(item => item.variant_id !== variantId))
    setQuantityInputs(prev => {
      const newInputs = { ...prev }
      delete newInputs[variantId]
      return newInputs
    })
  }

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId)
      return
    }
    setPoItems(prev =>
      prev.map(item =>
        item.variant_id === variantId
          ? { ...item, quantity, subtotal: quantity * item.unit_cost }
          : item
      )
    )
    setQuantityInputs(prev => ({ ...prev, [variantId]: quantity.toString() }))
  }

  const filteredProducts = products.filter((variant) => {
    const product = variant.products
    const searchLower = searchTerm.toLowerCase()
    return (
      product.brands.name.toLowerCase().includes(searchLower) ||
      variant.sku.toLowerCase().includes(searchLower) ||
      product.categories.name.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    )
  }

  const distributor = distributors.find(d => d.id === selectedDistributor)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/purchase-orders/${poId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-white mb-2">
              Edit Purchase Order
            </h1>
            <p className="text-muted-foreground">Update draft purchase order</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Distributor</CardTitle>
            <CardDescription className="font-sans">Select a distributor for this purchase order</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder="Select distributor" />
              </SelectTrigger>
              <SelectContent>
                {distributors.map((dist) => (
                  <SelectItem key={dist.id} value={dist.id} className="font-sans">
                    {dist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Add Products</CardTitle>
            <CardDescription className="font-sans">Search and add products to the purchase order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by brand, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="font-sans"
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredProducts.slice(0, 50).map((variant) => {
                const product = variant.products
                return (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-2 rounded border border-gold/10 hover:bg-gold/5"
                  >
                    <div className="flex-1">
                      <div className="font-medium font-sans text-sm">
                        {product.brands.name} {variant.size_ml}ml
                      </div>
                      <div className="text-xs text-muted-foreground font-sans">
                        {product.categories.name} • SKU: {variant.sku}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addProduct(variant)}
                      className="font-sans"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans">Purchase Order Items</CardTitle>
          <CardDescription className="font-sans">
            {poItems.length} item(s) • Total: {formatCurrency(totalAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {poItems.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold/10">
                      <th className="text-left p-2 font-sans text-sm">Brand</th>
                      <th className="text-left p-2 font-sans text-sm">Size</th>
                      <th className="text-right p-2 font-sans text-sm">Qty</th>
                      <th className="text-right p-2 font-sans text-sm">Unit Cost</th>
                      <th className="text-right p-2 font-sans text-sm">Subtotal</th>
                      <th className="text-right p-2 font-sans text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item) => (
                      <tr key={item.variant_id} className="border-b border-gold/5">
                        <td className="p-2 font-sans text-sm">{item.brand_name}</td>
                        <td className="p-2 font-sans text-sm">{item.size_ml}ml</td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min="1"
                            value={quantityInputs[item.variant_id] || item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1
                              setQuantityInputs(prev => ({ ...prev, [item.variant_id]: e.target.value }))
                              updateQuantity(item.variant_id, qty)
                            }}
                            className="w-20 text-right font-sans"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_cost}
                            onChange={(e) => {
                              const cost = parseFloat(e.target.value) || 0
                              updateUnitCost(item.variant_id, cost)
                            }}
                            className="w-24 text-right font-sans"
                          />
                        </td>
                        <td className="p-2 text-right font-sans text-sm font-semibold">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.variant_id)}
                            className="font-sans"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button
                  onClick={handleSaveDraft}
                  disabled={saving || sending}
                  variant="outline"
                  className="font-sans"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </Button>
                {distributor?.email && (
                  <Button
                    onClick={handleSendEmail}
                    disabled={saving || sending}
                    className="font-sans"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sending ? "Sending..." : "Send Email"}
                  </Button>
                )}
                {distributor?.phone && (
                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={saving || sending}
                    className="font-sans"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {sending ? "Sending..." : "Send WhatsApp"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 font-sans">
              No items added yet. Search and add products above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

