"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Plus, ScanLine, Camera } from "lucide-react"
import { playScanBeep } from "@/lib/sound"
import { toast } from "sonner"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { QuickAddProductDialog } from "@/components/products/quick-add-product-dialog"
import { ProductsTable } from "@/components/products/products-table"

export default function ProductsPage() {
  const [liquorProducts, setLiquorProducts] = useState<any[]>([])
  const [beverageProducts, setBeverageProducts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"liquor" | "beverage">("liquor")
  const [barcode, setBarcode] = useState("")
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [scannedUPC, setScannedUPC] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

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

      // Product found - reload products to show it in the appropriate section
      playScanBeep()
      await loadProducts()
      toast.success("Product found and displayed in catalog")
    } catch (error) {
      toast.error("Error processing barcode")
    }
  }

  const handleProductCreated = async (_variantId: string) => {
    // Reload products after new product is created to show it in the appropriate section
    await loadProducts()
    playScanBeep()
    toast.success("Product created and added to catalog")
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Products</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="w-full md:w-auto"
            onClick={() => {
              setScannedUPC("")
              setShowQuickAdd(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
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
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>Manage your product catalog by type</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "liquor" | "beverage")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="liquor" className="font-sans">Liquor</TabsTrigger>
              <TabsTrigger value="beverage" className="font-sans">Beverage</TabsTrigger>
            </TabsList>
            <TabsContent value="liquor" className="mt-0">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground mb-4">
                  All liquor products in your inventory ({liquorProducts.length} products)
                </div>
                <ProductsTable products={liquorProducts} />
              </div>
            </TabsContent>
            <TabsContent value="beverage" className="mt-0">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground mb-4">
                  All beverage products in your inventory ({beverageProducts.length} products)
                </div>
                <ProductsTable products={beverageProducts} />
              </div>
            </TabsContent>
          </Tabs>
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
