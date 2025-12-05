"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

interface QuickAddProductDialogProps {
  scannedUPC: string
  isOpen: boolean
  onClose: () => void
  onProductCreated: (variantId: string) => void
  context: "pos" | "receiving"
}

export function QuickAddProductDialog({
  scannedUPC,
  isOpen,
  onClose,
  onProductCreated,
  context: _context,
}: QuickAddProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    brandId: "",
    categoryId: "",
    productType: "liquor" as "liquor" | "beverage",
    sizeMl: "750",
    price: "",
    cost: "",
    sku: "",
    upc: "",
  })

  useEffect(() => {
    if (isOpen) {
      loadBrandsAndCategories()
      // Reset form and set UPC when dialog opens
      setFormData({
        brandId: "",
        categoryId: "",
        productType: "liquor",
        sizeMl: "750",
        price: "",
        cost: "",
        sku: "",
        upc: scannedUPC,
      })
    }
  }, [isOpen, scannedUPC])

  useEffect(() => {
    // Auto-generate SKU from brand and size when it changes
    if (formData.brandId && brands.length > 0) {
      const brandName = brands.find(b => b.id === formData.brandId)?.name || ""
      const sku = `${brandName.toUpperCase().replace(/\s/g, '')}-${formData.sizeMl}`
      setFormData(prev => ({ ...prev, sku }))
    }
  }, [formData.brandId, formData.sizeMl, brands])

  const loadBrandsAndCategories = async () => {
    const [brandsRes, categoriesRes] = await Promise.all([
      supabase.from("brands").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ])

    if (brandsRes.data) setBrands(brandsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.brandId) {
        toast.error("Please select a brand")
        setLoading(false)
        return
      }
      if (!formData.categoryId) {
        toast.error("Please select a category")
        setLoading(false)
        return
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast.error("Please enter a valid selling price")
        setLoading(false)
        return
      }
      if (scannedUPC && (!formData.upc || !formData.upc.trim())) {
        toast.error("UPC is required")
        setLoading(false)
        return
      }

      // Create product first
      const { data: product, error: productError } = await ((supabase
        .from("products") as any)
        .insert({
          brand_id: formData.brandId,
          category_id: formData.categoryId,
          product_type: formData.productType,
        })
        .select()
        .single())

      if (productError) {
        console.error("Product creation error:", productError)
        throw new Error(productError.message || "Failed to create product")
      }

      if (!product || !product.id) {
        throw new Error("Product was created but no ID was returned")
      }

      // Create variant with the scanned UPC
      const { data: variant, error: variantError } = await ((supabase
        .from("product_variants") as any)
        .insert({
          product_id: product.id,
          size_ml: parseInt(formData.sizeMl),
          sku: formData.sku.trim() || `SKU-${Date.now()}`,
          upc: formData.upc.trim() || null,
          cost: parseFloat(formData.cost) || 0,
          price: parseFloat(formData.price),
        })
        .select()
        .single())

      if (variantError) {
        console.error("Variant creation error:", variantError)
        throw new Error(variantError.message || "Failed to create product variant")
      }

      if (!variant || !variant.id) {
        throw new Error("Variant was created but no ID was returned")
      }

      toast.success("Product created successfully!")
      onProductCreated(variant.id)
      onClose()
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(`Error creating product: ${error.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans">Add Product</DialogTitle>
            <DialogDescription className="font-sans">
              {scannedUPC ? (
                <>Product not found for barcode: <strong>{scannedUPC}</strong>. Create it now?</>
              ) : (
                <>Create a new product in the catalog</>
              )}
            </DialogDescription>
          </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productType" className="font-sans">Product Type *</Label>
              <Select
                value={formData.productType}
                onValueChange={(value) => setFormData({ ...formData, productType: value as "liquor" | "beverage" })}
                required
              >
                <SelectTrigger className="font-sans">
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liquor" className="font-sans">Liquor</SelectItem>
                  <SelectItem value="beverage" className="font-sans">Beverage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upc" className="font-sans">UPC / Barcode {scannedUPC ? '*' : '(Optional)'}</Label>
              <Input
                id="upc"
                value={formData.upc}
                onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                required={!!scannedUPC}
                className="font-sans"
                readOnly={!!scannedUPC}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand" className="font-sans">Brand *</Label>
                <Select
                  value={formData.brandId}
                  onValueChange={(value) => setFormData({ ...formData, brandId: value })}
                  required
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id} className="font-sans">
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="font-sans">Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  required
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id} className="font-sans">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sizeMl" className="font-sans">Size (ml) *</Label>
                <Select
                  value={formData.sizeMl}
                  onValueChange={(value) => setFormData({ ...formData, sizeMl: value })}
                  required
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250" className="font-sans">250ml</SelectItem>
                    <SelectItem value="300" className="font-sans">300ml</SelectItem>
                    <SelectItem value="330" className="font-sans">330ml</SelectItem>
                    <SelectItem value="500" className="font-sans">500ml</SelectItem>
                    <SelectItem value="750" className="font-sans">750ml</SelectItem>
                    <SelectItem value="1000" className="font-sans">1L (1000ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="font-sans">Selling Price (KES) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                  className="font-sans"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost" className="font-sans">Cost (KES)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                  className="font-sans"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku" className="font-sans">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Auto-generated"
                className="font-sans"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="font-sans">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="font-sans">
              {loading ? "Creating..." : "Create & Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

