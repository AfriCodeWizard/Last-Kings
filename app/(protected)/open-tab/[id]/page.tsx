"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScanLine, ShoppingCart, CreditCard, X, ArrowLeft } from "lucide-react"
import { playScanBeepWithVibration } from "@/lib/sound"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { CashPaymentDialog } from "@/components/pos/cash-payment-dialog"
import Link from "next/link"

interface CartItem {
  variant_id: string
  brand_name: string
  product_type: string
  size_ml: number
  price: number
  quantity: number
  category_name?: string
}

export default function TabDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tabId = params.id as string
  
  const [barcode, setBarcode] = useState("")
  const [showScanner, setShowScanner] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [showCashDialog, setShowCashDialog] = useState(false)
  const [tab, setTab] = useState<{
    id: string
    customer_name: string
    phone: string | null
    total_amount: number
    status: string
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTab()
  }, [tabId])

  const loadTab = async () => {
    try {
      const { data, error } = await supabase
        .from("tabs")
        .select("*")
        .eq("id", tabId)
        .single()

      if (error) throw error
      setTab(data)
    } catch (error: any) {
      toast.error("Error loading tab")
      console.error(error)
    }
  }

  const handleBarcodeScan = async (value: string) => {
    if (!value || value.trim().length === 0) {
      toast.error("Invalid barcode")
      return
    }

    if (isScanning) {
      return
    }

    setIsScanning(true)
    try {
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

      if (error) {
        toast.error(`Database error: ${error.message}`)
        return
      }

      if (!variants || variants.length === 0) {
        toast.error("Product not found. Please ensure the barcode is correct.")
        return
      }

      const variant = variants[0]

      // Check available stock at floor location
      const { data: floorLocation, error: locationError } = await supabase
        .from("inventory_locations")
        .select("id")
        .eq("type", "floor")
        .limit(1)
        .maybeSingle()

      if (locationError || !floorLocation) {
        toast.error("Error checking inventory location.")
        return
      }

      const floorLocationId = (floorLocation as { id: string }).id

      const { data: stockLevels, error: stockError } = await supabase
        .from("stock_levels")
        .select("quantity")
        .eq("variant_id", variant.id)
        .eq("location_id", floorLocationId)

      if (stockError) {
        toast.error("Error checking stock availability")
        return
      }

      const totalStock = (stockLevels as Array<{ quantity: number }> | null)?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

      const existingInCart = cart.find((item) => item.variant_id === variant.id)
      const cartQuantity = existingInCart ? existingInCart.quantity : 0

      if (totalStock <= 0) {
        toast.error("No stock available for this item")
        return
      }

      if (cartQuantity >= totalStock) {
        toast.error("Insufficient stock available - Cannot add more items")
        return
      }

      playScanBeepWithVibration()
      const cartItem = {
        variant_id: variant.id,
        brand_name: variant.products.brands?.name || '',
        product_type: variant.products.product_type || 'liquor',
        size_ml: variant.size_ml,
        price: variant.price,
        quantity: 1,
        category_name: variant.products.categories?.name,
      }
      addToCart(cartItem)
    } catch (error) {
      console.error("Error scanning barcode:", error)
      toast.error("Error processing barcode")
    } finally {
      setIsScanning(false)
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

  const addItemsToTab = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    if (!tab || tab.status === "closed") {
      toast.error("This tab is closed")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      // Check stock availability before adding
      const { data: floorLocation, error: locationError } = await supabase
        .from("inventory_locations")
        .select("id")
        .eq("type", "floor")
        .limit(1)
        .maybeSingle()

      if (locationError || !floorLocation) {
        toast.error("Error checking inventory location.")
        return
      }

      const floorLocationId = (floorLocation as { id: string }).id

      // Verify stock for each item in cart
      for (const item of cart) {
        const { data: stockLevels, error: stockError } = await supabase
          .from("stock_levels")
          .select("quantity")
          .eq("variant_id", item.variant_id)
          .eq("location_id", floorLocationId)

        if (stockError) {
          toast.error(`Error checking stock for ${item.brand_name}`)
          return
        }

        const totalStock = (stockLevels as Array<{ quantity: number }> | null)?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

        if (totalStock < item.quantity) {
          toast.error(`Insufficient stock for ${item.brand_name}. Available: ${totalStock}, Requested: ${item.quantity}`)
          return
        }
      }

      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const saleNumber = `TAB-${Date.now()}`

      // Create sale linked to tab
      const { data: sale, error: saleError } = await (supabase.from("sales") as any)
        .insert({
          sale_number: saleNumber,
          tab_id: tabId,
          total_amount: subtotal,
          tax_amount: 0,
          excise_tax: 0,
          payment_method: "cash", // Tab items are marked as cash, but payment happens on cash out
          sold_by: user.id,
          age_verified: true,
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
        lot_number: null,
      }))

      const { error: itemsError } = await (supabase.from("sale_items") as any)
        .insert(saleItems)

      if (itemsError) {
        await supabase.from("sales").delete().eq("id", sale.id)
        throw new Error(`Failed to create sale items: ${itemsError.message}`)
      }

      toast.success(`Items added to tab! ${saleNumber}`)
      
      // Clear cart and reload tab
      setCart([])
      await loadTab()
      if (inputRef.current) {
        inputRef.current.focus()
      }
    } catch (error: any) {
      toast.error("Error adding items to tab")
      console.error(error)
    }
  }

  const handleCashOut = async (receivedAmount?: number, change?: number) => {
    if (!tab || tab.status === "closed") {
      toast.error("This tab is closed")
      return
    }

    if (tab.total_amount === 0) {
      toast.error("Tab has no items to cash out")
      return
    }

    // If cash payment, show dialog first
    if (receivedAmount === undefined) {
      setShowCashDialog(true)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      // Update all sales for this tab with payment details
      const { error: updateError } = await (supabase.from("sales") as any)
        .update({
          received_amount: receivedAmount,
          change_given: change || 0,
        })
        .eq("tab_id", tabId)
        .is("received_amount", null) // Only update sales that haven't been paid yet

      if (updateError) throw updateError

      // Close the tab by updating its status
      const { error: tabError } = await (supabase.from("tabs") as any)
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", tabId)

      if (tabError) throw tabError

      const successMessage = change && change > 0
        ? `Tab closed! Change: ${formatCurrency(change)}`
        : `Tab closed successfully!`

      const { vibrateComplete } = await import('@/lib/vibration')
      vibrateComplete()

      toast.success(successMessage, {
        description: `Total: ${formatCurrency(tab.total_amount)}`,
        duration: 5000,
      })
      
      router.push("/open-tab")
    } catch (error: any) {
      toast.error("Error cashing out tab")
      console.error(error)
    }
  }

  if (!tab) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Tab not found</p>
          <Link href="/open-tab">
            <Button variant="outline" className="mt-4">Back to Tabs</Button>
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/open-tab">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">
            Tab: {tab.customer_name}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {tab.phone && `Phone: ${tab.phone} • `}
            Total: {formatCurrency(tab.total_amount)} • Status: {tab.status === "open" ? "Open" : "Closed"}
          </p>
        </div>
        {tab.status === "open" && tab.total_amount > 0 && (
          <Button 
            onClick={() => handleCashOut()} 
            size="lg"
            className="bg-gold text-black hover:bg-gold/90"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Cash Out
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Items to Tab</CardTitle>
              <CardDescription>Scan barcode to add items</CardDescription>
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
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && barcode.trim().length >= 8) {
                        e.preventDefault()
                        const trimmedBarcode = barcode.trim()
                        setBarcode("")
                        await handleBarcodeScan(trimmedBarcode)
                      }
                    }}
                    className="pl-10"
                    autoFocus
                    disabled={tab.status === "closed"}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="bg-gold text-black hover:bg-gold/90 font-sans"
                  disabled={tab.status === "closed"}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
              {tab.status === "closed" && (
                <p className="text-sm text-muted-foreground">This tab is closed. No items can be added.</p>
              )}
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
                  <div className="flex justify-between font-bold text-lg text-gold">
                    <span>Subtotal</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Current Tab Total</span>
                    <span>{formatCurrency(tab.total_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>New Tab Total</span>
                    <span>{formatCurrency(tab.total_amount + total)}</span>
                  </div>

                  <Button 
                    onClick={addItemsToTab} 
                    className="w-full" 
                    size="lg"
                    disabled={tab.status === "closed"}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Tab
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
        onScan={async (scannedBarcode) => {
          try {
            await handleBarcodeScan(scannedBarcode)
            setBarcode("")
          } catch (error) {
            console.error("Error in scanner callback:", error)
            toast.error("Error processing scanned barcode")
          }
        }}
        title="Scan Barcode"
        description="Position the barcode on the liquor bottle within the frame"
      />

      <CashPaymentDialog
        isOpen={showCashDialog}
        onClose={() => setShowCashDialog(false)}
        total={tab.total_amount}
        onConfirm={(receivedAmount, change) => {
          setShowCashDialog(false)
          handleCashOut(receivedAmount, change)
        }}
      />
    </div>
  )
}

