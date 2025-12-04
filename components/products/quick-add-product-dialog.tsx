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
import { formatCurrency } from "@/lib/utils"

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
  context,
}: QuickAddProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    productName: "",
    brandId: "",
    categoryId: "",
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
        productName: "",
        brandId: "",
        categoryId: "",
        sizeMl: "750",
        price: "",
        cost: "",
        sku: "",
        upc: scannedUPC,
      })
    }
  }, [isOpen, scannedUPC])

  useEffect(() => {
    // Auto-generate SKU from product name when it changes
    if (formData.productName && formData.brandId && brands.length > 0) {
      const brandName = brands.find(b => b.id === formData.brandId)?.name || ""
      const sku = `${brandName.toUpperCase().replace(/\s/g, '')}-${formData.productName.toUpperCase().replace(/\s/g, '')}-${formData.sizeMl}`
      setFormData(prev => ({ ...prev, sku }))
    }
  }, [formData.productName, formData.brandId, formData.sizeMl, brands])

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
      // Create product first
      const { data: product, error: productError } = await ((supabase
        .from("products") as any)
        .insert({
          name: formData.productName,
          brand_id: formData.brandId,
          category_id: formData.categoryId,
        })
        .select()
        .single())

      if (productError) throw productError

      // Create variant with the scanned UPC
      const { data: variant, error: variantError } = await ((supabase
        .from("product_variants") as any)
        .insert({
          product_id: product.id,
          size_ml: parseInt(formData.sizeMl),
          sku: formData.sku || `SKU-${Date.now()}`,
          upc: formData.upc,
          cost: parseFloat(formData.cost) || 0,
          price: parseFloat(formData.price) || 0,
        })
        .select()
        .single())

      if (variantError) throw variantError

      toast.success("Product created successfully!")
      onProductCreated(variant.id)
      onClose()
      
      // Reset form
      setFormData({
        productName: "",
        brandId: "",
        categoryId: "",
        sizeMl: "750",
        price: "",
        cost: "",
        sku: "",
        upc: scannedUPC,
      })
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(`Error creating product: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sans">Quick Add Product</DialogTitle>
          <DialogDescription className="font-sans">
            Product not found for barcode: <strong>{scannedUPC}</strong>. Create it now?
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="productName" className="font-sans">Product Name *</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="e.g., Glenfiddich 18 Year"
                  required
                  className="font-sans"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upc" className="font-sans">UPC / Barcode *</Label>
                <Input
                  id="upc"
                  value={formData.upc}
                  onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                  required
                  className="font-sans"
                  readOnly
                />
              </div>
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
                    <SelectItem value="50" className="font-sans">50ml</SelectItem>
                    <SelectItem value="200" className="font-sans">200ml</SelectItem>
                    <SelectItem value="375" className="font-sans">375ml</SelectItem>
                    <SelectItem value="500" className="font-sans">500ml</SelectItem>
                    <SelectItem value="750" className="font-sans">750ml</SelectItem>
                    <SelectItem value="1000" className="font-sans">1000ml</SelectItem>
                    <SelectItem value="1500" className="font-sans">1500ml</SelectItem>
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

