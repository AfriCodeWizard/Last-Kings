"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Mail, MessageCircle, X } from "lucide-react"

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
    brands: { name: string }
    categories: { name: string }
  }
}

interface POItem {
  variant_id: string
  product_type: string
  brand_name: string
  size_ml: number
  sku: string
  quantity: number
  unit_cost: number
  subtotal: number
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [products, setProducts] = useState<ProductVariant[]>([])
  const [selectedDistributor, setSelectedDistributor] = useState<string>("")
  const [poItems, setPoItems] = useState<POItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  const addItem = (variant: ProductVariant) => {
    const existingItem = poItems.find(item => item.variant_id === variant.id)
    
    if (existingItem) {
      setPoItems(poItems.map(item =>
        item.variant_id === variant.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.unit_cost
            }
          : item
      ))
    } else {
      const newItem: POItem = {
        variant_id: variant.id,
        product_type: (variant.products as any).product_type || 'liquor',
        brand_name: variant.products.brands.name,
        size_ml: variant.size_ml,
        sku: variant.sku,
        quantity: 1,
        unit_cost: variant.cost,
        subtotal: variant.cost
      }
      setPoItems([...poItems, newItem])
    }
    toast.success("Item added to PO")
  }

  const removeItem = (variantId: string) => {
    setPoItems(poItems.filter(item => item.variant_id !== variantId))
    toast.success("Item removed")
  }

  const updateQuantity = (variantId: string, quantity: number) => {
    // Allow any quantity >= 1, or allow temporary values during typing
    const validQuantity = quantity >= 1 ? quantity : 1
    setPoItems(poItems.map(item =>
      item.variant_id === variantId
        ? {
            ...item,
            quantity: validQuantity,
            subtotal: validQuantity * item.unit_cost
          }
        : item
    ))
  }

  const updateUnitCost = (variantId: string, cost: number) => {
    if (cost < 0) return
    setPoItems(poItems.map(item =>
      item.variant_id === variantId
        ? {
            ...item,
            unit_cost: cost,
            subtotal: item.quantity * cost
          }
        : item
    ))
  }

  const totalAmount = poItems.reduce((sum, item) => sum + item.subtotal, 0)

  const generatePONumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `PO-${year}${month}${day}-${random}`
  }

  const createPO = async (status: 'draft' | 'sent' = 'draft') => {
    if (!selectedDistributor) {
      toast.error("Please select a distributor")
      return
    }

    if (poItems.length === 0) {
      toast.error("Please add at least one item to the purchase order")
      return
    }

    if (!currentUserId) {
      toast.error("User not authenticated")
      return
    }

    setLoading(true)

    try {
      const poNumber = generatePONumber()

      // Create purchase order
      const { data: po, error: poError } = await ((supabase
        .from("purchase_orders") as any)
        .insert({
          po_number: poNumber,
          distributor_id: selectedDistributor,
          status,
          total_amount: totalAmount,
          created_by: currentUserId,
        })
        .select()
        .single())

      if (poError) throw poError

      // Create PO items
      const itemsToInsert = poItems.map(item => ({
        po_id: po.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }))

      const { error: itemsError } = await ((supabase
        .from("po_items") as any)
        .insert(itemsToInsert))

      if (itemsError) throw itemsError

      toast.success(`Purchase order ${poNumber} created successfully!`)
      return po
    } catch (error: any) {
      console.error("Error creating PO:", error)
      toast.error(`Error creating purchase order: ${error.message}`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    try {
      await createPO('draft')
      router.push("/purchase-orders")
    } catch (error) {
      // Error already handled in createPO
    }
  }

  const handleSendEmail = async () => {
    if (!selectedDistributor) {
      toast.error("Please select a distributor")
      return
    }

    const distributor = distributors.find(d => d.id === selectedDistributor)
    if (!distributor?.email) {
      toast.error("Distributor email not found")
      return
    }

    setSending(true)

    try {
      const po = await createPO('sent')

      const response = await fetch('/api/purchase-orders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId: po.id,
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
    if (!selectedDistributor) {
      toast.error("Please select a distributor")
      return
    }

    const distributor = distributors.find(d => d.id === selectedDistributor)
    if (!distributor?.phone) {
      toast.error("Distributor phone number not found")
      return
    }

    setSending(true)

    try {
      const po = await createPO('sent')

      const response = await fetch('/api/purchase-orders/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId: po.id,
          distributorPhone: distributor.phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send WhatsApp message')
      }

      // Open WhatsApp in a new window/tab
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank')
        toast.success("Opening WhatsApp... Purchase order ready to send!")
      } else {
        toast.success("Purchase order created! WhatsApp URL generated.")
      }
      
      // Small delay before redirecting to allow WhatsApp to open
      setTimeout(() => {
        router.push("/purchase-orders")
      }, 1000)
    } catch (error: any) {
      console.error("Error sending WhatsApp:", error)
      toast.error(`Error sending WhatsApp: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const filteredProducts = products.filter(variant =>
    ((variant.products as any).product_type === 'liquor' ? 'liquor' : 'beverage').includes(searchTerm.toLowerCase()) ||
    variant.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.products.brands.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">New Purchase Order</h1>
        <p className="text-sm md:text-base text-muted-foreground">Create and send a purchase order to a supplier</p>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Distributor</CardTitle>
              <CardDescription className="font-sans">Select the supplier for this purchase order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="distributor" className="font-sans">Distributor *</Label>
                <Select
                  value={selectedDistributor}
                  onValueChange={setSelectedDistributor}
                  required
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder="Select distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id} className="font-sans">
                        {dist.name} {dist.email && `(${dist.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDistributor && (
                  <div className="text-sm text-muted-foreground font-sans mt-2">
                    {(() => {
                      const dist = distributors.find(d => d.id === selectedDistributor)
                      return dist && (
                        <div>
                          {dist.contact_name && <div>Contact: {dist.contact_name}</div>}
                          {dist.email && <div>Email: {dist.email}</div>}
                          {dist.phone && <div>Phone: {dist.phone}</div>}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Add Products</CardTitle>
              <CardDescription className="font-sans">Search and add products to the purchase order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="font-sans">Search Products</Label>
                <Input
                  id="search"
                  placeholder="Search by name, SKU, or brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="font-sans"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex justify-between items-center p-3 rounded-lg border border-gold/10 hover:border-gold/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium font-sans">
                          {variant.products.brands.name}
                        </div>
                        <div className="text-sm text-muted-foreground font-sans">
                          {variant.size_ml}ml • SKU: {variant.sku} • Cost: {formatCurrency(variant.cost)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addItem(variant)}
                        className="font-sans"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground font-sans text-center py-4">
                    {searchTerm ? "No products found" : "Start typing to search products"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Purchase Order Items</CardTitle>
              <CardDescription className="font-sans">
                {poItems.length} item{poItems.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {poItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {poItems.map((item) => (
                      <div
                        key={item.variant_id}
                        className="p-3 rounded-lg border border-gold/10 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium font-sans text-sm">
                              {item.brand_name}
                            </div>
                            <div className="text-xs text-muted-foreground font-sans">
                              {item.size_ml}ml • {item.sku}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.variant_id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-sans">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={quantityInputs[item.variant_id] !== undefined ? quantityInputs[item.variant_id] : item.quantity.toString()}
                              onChange={(e) => {
                                const val = e.target.value
                                // Allow any input while typing
                                setQuantityInputs(prev => ({ ...prev, [item.variant_id]: val }))
                              }}
                              onBlur={(e) => {
                                const val = e.target.value.trim()
                                const numVal = val === "" ? 1 : parseInt(val)
                                const finalQuantity = isNaN(numVal) || numVal < 1 ? 1 : numVal
                                updateQuantity(item.variant_id, finalQuantity)
                                // Clear the input state to sync with actual quantity
                                setQuantityInputs(prev => {
                                  const updated = { ...prev }
                                  delete updated[item.variant_id]
                                  return updated
                                })
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur()
                                }
                              }}
                              className="h-8 text-sm font-sans"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-sans">Unit Cost</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) => updateUnitCost(item.variant_id, parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm font-sans"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gold font-sans">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gold/20 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold font-sans">Total:</span>
                      <span className="text-xl font-bold text-gold font-sans">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-sans text-center py-4">
                  No items added yet
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button
              onClick={handleSaveDraft}
              disabled={loading || sending || !selectedDistributor || poItems.length === 0}
              variant="outline"
              className="w-full font-sans"
            >
              {loading ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={loading || sending || !selectedDistributor || poItems.length === 0}
              className="w-full font-sans"
            >
              <Mail className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send via Email"}
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              disabled={loading || sending || !selectedDistributor || poItems.length === 0}
              variant="secondary"
              className="w-full font-sans"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send via WhatsApp"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
