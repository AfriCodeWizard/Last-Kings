"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanLine, ShoppingCart, CreditCard, X } from "lucide-react"
import { playScanBeep } from "@/lib/sound"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { calculateTotalExciseDuty, calculateKRATaxes } from "@/lib/kra-tax"
import { BarcodeScanner } from "@/components/barcode-scanner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface CartItem {
  variant_id: string
  brand_name: string
  product_type: string
  size_ml: number
  price: number
  quantity: number
  category_name?: string
}

export default function POSPage() {
  const [barcode, setBarcode] = useState("")
  const [showScanner, setShowScanner] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa">("cash")
  const inputRef = useRef<HTMLInputElement>(null)


  const handleBarcodeScan = async (value: string) => {
    console.log("handleBarcodeScan called with value:", value)
    if (!value || value.trim().length === 0) {
      console.error("Empty barcode provided")
      toast.error("Invalid barcode")
      return
    }
    try {
      console.log("Querying database for UPC:", value.trim())
      // Query without .single() to avoid error when no results
      const { data: variants, error } = await (supabase
        .from("product_variants")
        .select(`
          id,
          size_ml,
          price,
          sku,
          products!inner(
            product_type,
            brands!inner(name),
            categories!inner(name)
          )
        `)
        .eq("upc", value.trim())
        .limit(1) as any)

      console.log("Database query result:", { variants, error, count: variants?.length })

      if (error) {
        console.error("Database error:", error)
        toast.error(`Database error: ${error.message}`)
        return
      }

      if (!variants || variants.length === 0) {
        console.error("No variant found for UPC:", value)
        toast.error("Product not found. Please ensure the barcode is correct.")
        return
      }

      const variant = variants[0]
      console.log("Variant found:", variant)

      // Check if item is already sold - check sale_items table first
      const { data: soldItems } = await supabase
        .from("sale_items")
        .select("quantity")
        .eq("variant_id", variant.id)

      const totalSold = soldItems?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

      // Check available stock at floor location
      const { data: floorLocation } = await supabase
        .from("inventory_locations")
        .select("id")
        .eq("type", "floor")
        .limit(1)
        .single()

      if (floorLocation) {
        const { data: stockLevels } = await supabase
          .from("stock_levels")
          .select("quantity")
          .eq("variant_id", variant.id)
          .eq("location_id", floorLocation.id)

        const totalStock = stockLevels?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

        // Check if item is already in cart
        const existingInCart = cart.find((item) => item.variant_id === variant.id)
        const cartQuantity = existingInCart ? existingInCart.quantity : 0

        // If no stock available and item has been sold, show warning
        if (totalStock <= 0 && totalSold > 0) {
          toast.error("⚠️ Item already sold - This item has been sold and is no longer available")
          return
        }

        if (totalStock <= 0) {
          toast.error("Item already sold - No stock available")
          return
        }

        if (cartQuantity >= totalStock) {
          toast.error("Item already sold - Insufficient stock available")
          return
        }
      }

      console.log("Variant found:", variant)
      playScanBeep()
      const cartItem = {
        variant_id: variant.id,
        brand_name: variant.products.brands?.name || '',
        product_type: variant.products.product_type || 'liquor',
        size_ml: variant.size_ml,
        price: variant.price,
        quantity: 1,
        category_name: variant.products.categories?.name,
      }
      console.log("Adding to cart:", cartItem)
      addToCart(cartItem)
      console.log("Item added to cart")
    } catch (error) {
      console.error("Error scanning barcode:", error)
      toast.error("Error processing barcode")
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
    toast.success(`${item.brand_name} added to cart`)
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

  // Calculate subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  
  // Calculate KRA-compliant taxes
  const exciseDuty = calculateTotalExciseDuty(cart)
  const { vat, total } = calculateKRATaxes(subtotal, exciseDuty)
  
  // For display purposes
  const tax = vat // VAT is the main tax shown
  const exciseTax = exciseDuty

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      // Check stock availability before checkout
      const { data: floorLocation } = await supabase
        .from("inventory_locations")
        .select("id")
        .eq("type", "floor")
        .limit(1)
        .single()

      if (floorLocation) {
        for (const item of cart) {
          const { data: stockLevels } = await supabase
            .from("stock_levels")
            .select("quantity")
            .eq("variant_id", item.variant_id)
            .eq("location_id", floorLocation.id)

          const totalStock = stockLevels?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

          if (totalStock < item.quantity) {
            toast.error(`Insufficient stock for ${item.brand_name}. Available: ${totalStock}, Requested: ${item.quantity}`)
            return
          }
        }
      }

      // Generate sale number
      const saleNumber = `SALE-${Date.now()}`

      // Create sale
      const { data: sale, error: saleError } = await ((supabase.from("sales") as any)
        .insert({
          sale_number: saleNumber,
          total_amount: total,
          tax_amount: tax,
          excise_tax: exciseTax,
          payment_method: paymentMethod,
          sold_by: user.id,
          age_verified: true, // Auto-verified, no requirement
        })
        .select()
        .single())

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.price,
      }))

      const { error: itemsError } = await ((supabase.from("sale_items") as any)
        .insert(saleItems))

      if (itemsError) throw itemsError

      toast.success(`Sale completed! ${saleNumber}`)
      setCart([])
    } catch (error) {
      toast.error("Error processing sale")
      console.error(error)
    }
  }


  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">POS / Quick Sale</h1>
        <p className="text-sm md:text-base text-muted-foreground">Process sales and transactions</p>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan Products</CardTitle>
              <CardDescription>Scan barcode to add items to cart</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gold" />
                  <Input
                    ref={inputRef}
                    placeholder="Scan barcode or enter UPC..."
                    value={barcode}
                    onChange={(e) => {
                      setBarcode(e.target.value)
                      if (e.target.value.length > 8) {
                        handleBarcodeScan(e.target.value)
                        setBarcode("")
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && barcode.trim().length > 8) {
                        handleBarcodeScan(barcode.trim())
                        setBarcode("")
                      }
                    }}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="bg-gold text-black hover:bg-gold/90 font-sans"
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
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
                        <div className="text-sm font-medium">
                          {item.brand_name}
                        </div>
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
                    <span>VAT (16%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Excise Duty (KRA)</span>
                    <span>{formatCurrency(exciseTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gold pt-2 border-t border-gold/20">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "mpesa")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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


      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={async (barcode) => {
          await handleBarcodeScan(barcode)
          setBarcode("")
        }}
        title="Scan Barcode"
        description="Position the barcode on the liquor bottle within the frame"
      />

    </div>
  )
}

