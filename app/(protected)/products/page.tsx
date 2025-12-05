"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ScanLine, Camera, X } from "lucide-react"
import { playScanBeep } from "@/lib/sound"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { QuickAddProductDialog } from "@/components/products/quick-add-product-dialog"
import { ProductsTable } from "@/components/products/products-table"
import Link from "next/link"

interface ScannedItem {
  variant_id: string
  brand_name: string
  product_type: string
  size_ml: number
  quantity: number
  lot_number: string | null
  expiry_date: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [liquorProducts, setLiquorProducts] = useState<any[]>([])
  const [beverageProducts, setBeverageProducts] = useState<any[]>([])
  const [barcode, setBarcode] = useState("")
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [scannedUPC, setScannedUPC] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadProducts()
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`
        *,
        brands(name),
        categories(name),
        product_variants(id, size_ml, sku, price, cost)
      `)
      .order("product_type")

    if (data) {
      setProducts(data)
      setLiquorProducts(data.filter((p: any) => p.product_type === 'liquor'))
      setBeverageProducts(data.filter((p: any) => p.product_type === 'beverage'))
    }
  }

  const handleBarcodeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) return

    // Wait a bit to see if user is still typing
    setTimeout(async () => {
      if (e.target.value.trim() === value && value.length > 0) {
        await processBarcode(value)
        setBarcode("")
      }
    }, 500)
  }

  const processBarcode = async (upc: string) => {
    try {
      const { data: variants, error } = await supabase
        .from("product_variants")
        .select(`
          id,
          upc,
          size_ml,
          products!inner(product_type, brands!inner(name))
        `)
        .eq("upc", upc.trim()) as any

      if (error) {
        console.error("Database error:", error)
        toast.error(`Database error: ${error.message}`)
        return
      }

      if (!variants || variants.length === 0) {
        setScannedUPC(upc)
        setShowQuickAdd(true)
        return
      }

      const variant = variants[0]
      playScanBeep()

      const variantTyped = variant as any
      const existingItem = scannedItems.find((item) => item.variant_id === variantTyped.id)

      if (existingItem) {
        setScannedItems((prev) =>
          prev.map((item) =>
            item.variant_id === variantTyped.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
        toast.success(`${variantTyped.products.brands?.name || 'Product'} quantity increased`)
      } else {
        const newItem: ScannedItem = {
          variant_id: variantTyped.id,
          brand_name: variantTyped.products.brands?.name || '',
          product_type: variantTyped.products.product_type || 'liquor',
          size_ml: variantTyped.size_ml,
          quantity: 1,
          lot_number: null,
          expiry_date: null,
        }
        setScannedItems((prev) => [...prev, newItem])
        toast.success(`${variantTyped.products.brands?.name || 'Product'} added`)
      }
    } catch (error) {
      toast.error("Error processing barcode")
    }
  }

  const handleProductCreated = async (variantId: string) => {
    // Reload products after new product is created
    await loadProducts()
    
    // Try to add the newly created variant to scanned items
    const { data: variant } = await supabase
      .from("product_variants")
      .select(`
        id,
        size_ml,
        products!inner(product_type, brands!inner(name))
      `)
      .eq("id", variantId)
      .single() as any

    if (variant) {
      playScanBeep()
      const newItem: ScannedItem = {
        variant_id: variant.id,
        brand_name: variant.products.brands?.name || '',
        product_type: variant.products.product_type || 'liquor',
        size_ml: variant.size_ml,
        quantity: 1,
        lot_number: null,
        expiry_date: null,
      }
      setScannedItems((prev) => [...prev, newItem])
      toast.success(`${variant.products.brands?.name || 'Product'} added`)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Products</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Link href="/products/new">
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan Product</CardTitle>
          <CardDescription>Scan or manually enter barcode to add products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode / UPC</Label>
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gold" />
              <Input
                id="barcode"
                ref={inputRef}
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value)
                  handleBarcodeScan(e)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && barcode.trim()) {
                    processBarcode(barcode.trim())
                    setBarcode("")
                  }
                }}
                placeholder="Scan or enter barcode..."
                className="pl-10 text-lg"
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              onClick={() => setShowScanner(true)}
              className="bg-gold text-black hover:bg-gold/90 font-sans"
            >
              <Camera className="h-5 w-5 mr-2" />
              Open Camera Scanner
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scanned Items ({scannedItems.length})</CardTitle>
          <CardDescription>Products scanned or added</CardDescription>
        </CardHeader>
        <CardContent>
          {scannedItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items scanned yet
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {scannedItems.map((item, idx) => (
                  <motion.div
                    key={`${item.variant_id}-${idx}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex justify-between items-center p-3 rounded-lg border border-gold/10 hover:bg-gold/5"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {item.brand_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.size_ml}ml
                        {item.lot_number && ` • Lot: ${item.lot_number}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gold">Qty: {item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setScannedItems((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liquor</CardTitle>
          <CardDescription>All liquor products in your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductsTable products={liquorProducts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Beverage</CardTitle>
          <CardDescription>All beverage products in your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductsTable products={beverageProducts} />
        </CardContent>
      </Card>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(value) => {
          processBarcode(value)
          setShowScanner(false)
        }}
      />

      <QuickAddProductDialog
        scannedUPC={scannedUPC}
        isOpen={showQuickAdd}
        onClose={() => {
          setShowQuickAdd(false)
          setScannedUPC("")
        }}
        onProductCreated={handleProductCreated}
        context="receiving"
      />
    </div>
  )
}
