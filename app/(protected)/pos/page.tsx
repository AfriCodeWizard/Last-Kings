"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, ScanLine, ShoppingCart, CreditCard, X, UserCheck } from "lucide-react"
import { playScanBeep } from "@/lib/sound"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface CartItem {
  variant_id: string
  product_name: string
  size_ml: number
  price: number
  quantity: number
}

export default function POSPage() {
  const [search, setSearch] = useState("")
  const [barcode, setBarcode] = useState("")
  const [products, setProducts] = useState<Array<{
    id: string
    name: string
    size_ml: number
    price: number
    sku: string
  }>>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [ageVerified, setAgeVerified] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "split">("card")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const { data } = await supabase
      .from("product_variants")
      .select(`
        id,
        size_ml,
        price,
        sku,
        products!inner(name)
      `)
      .eq("allocation_only", false)
      .limit(100)

    if (data) {
      setProducts(data.map((v: {
        id: string
        size_ml: number
        price: number
        sku: string
        products: { name: string }
      }) => ({
        id: v.id,
        name: v.products.name,
        size_ml: v.size_ml,
        price: v.price,
        sku: v.sku,
      })))
    }
  }

  const handleBarcodeScan = async (value: string) => {
    const { data: variant } = await supabase
      .from("product_variants")
      .select(`
        id,
        size_ml,
        price,
        sku,
        products!inner(name)
      `)
      .eq("upc", value)
      .single()

    if (variant) {
      playScanBeep()
      addToCart({
        variant_id: variant.id,
        product_name: variant.products.name,
        size_ml: variant.size_ml,
        price: variant.price,
        quantity: 1,
      })
    } else {
      toast.error("Product not found")
    }
  }

  const addToCart = (item: CartItem) => {
    const existing = cart.find((i) => i.variant_id === item.variant_id)
    if (existing) {
      setCart(cart.map((i) =>
        i.variant_id === item.variant_id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ))
    } else {
      setCart([...cart, item])
    }
    toast.success(`${item.product_name} added to cart`)
  }

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter((item) => item.variant_id !== variantId))
  }

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId)
      return
    }
    setCart(cart.map((item) =>
      item.variant_id === variantId ? { ...item, quantity } : item
    ))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxRate = 0.08 // 8% sales tax
  const exciseTaxRate = 0.05 // 5% excise tax
  const tax = subtotal * taxRate
  const exciseTax = subtotal * exciseTaxRate
  const total = subtotal + tax + exciseTax

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    if (!ageVerified) {
      setShowAgeVerification(true)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      // Generate sale number
      const saleNumber = `SALE-${Date.now()}`

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          sale_number: saleNumber,
          total_amount: total,
          tax_amount: tax,
          excise_tax: exciseTax,
          payment_method: paymentMethod,
          sold_by: user.id,
          age_verified: ageVerified,
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems)

      if (itemsError) throw itemsError

      toast.success(`Sale completed! ${saleNumber}`)
      setCart([])
      setAgeVerified(false)
    } catch (error) {
      toast.error("Error processing sale")
      console.error(error)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-gold mb-2">POS / Quick Sale</h1>
        <p className="text-muted-foreground">Process sales and transactions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gold" />
                <Input
                  ref={inputRef}
                  placeholder="Scan barcode..."
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value)
                    if (e.target.value.length > 8) {
                      handleBarcodeScan(e.target.value)
                      setBarcode("")
                    }
                  }}
                  className="pl-10"
                />
              </div>

              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {filteredProducts.slice(0, 20).map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center p-3 rounded-lg border border-gold/10 hover:bg-gold/5 cursor-pointer"
                    onClick={() => addToCart({
                      variant_id: product.id,
                      product_name: product.name,
                      size_ml: product.size_ml,
                      price: product.price,
                      quantity: 1,
                    })}
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.size_ml}ml • {formatCurrency(product.price)}
                      </div>
                    </div>
                    <Button size="sm">Add</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.variant_id}
                      className="flex justify-between items-center p-2 rounded border border-gold/10"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.size_ml}ml • {formatCurrency(item.price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.variant_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t border-gold/20">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (8%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Excise Tax (5%)</span>
                    <span>{formatCurrency(exciseTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gold pt-2 border-t border-gold/20">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "card" | "split")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="split">Split</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!ageVerified && (
                    <Badge variant="destructive" className="w-full justify-center py-2">
                      <UserCheck className="mr-2 h-4 w-4" />
                      Age Verification Required
                    </Badge>
                  )}

                  <Button onClick={handleCheckout} className="w-full" size="lg">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Complete Sale
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAgeVerification} onOpenChange={setShowAgeVerification}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Age Verification Required</DialogTitle>
            <DialogDescription>
              You must verify the customer's age before completing this alcohol sale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan customer ID or manually verify age (must be 21+)
            </p>
            <Button
              onClick={() => {
                setAgeVerified(true)
                setShowAgeVerification(false)
                toast.success("Age verified")
              }}
              className="w-full"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Verify Age (21+)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

