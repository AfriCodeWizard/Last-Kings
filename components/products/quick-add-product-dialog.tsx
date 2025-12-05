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
import { getBrandsForType, getCategoryForBrand, getCategoriesForType } from "@/data/product-catalog"
import { Plus } from "lucide-react"

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
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false)
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
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
    if (isOpen) {
      loadBrandsAndCategories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.productType])

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

    if (brandsRes.data) {
      // Sort brands: catalog brands first, then others
      const catalogBrands = getBrandsForType(formData.productType)
      const sorted = brandsRes.data.sort((a, b) => {
        const aInCatalog = catalogBrands.includes(a.name)
        const bInCatalog = catalogBrands.includes(b.name)
        if (aInCatalog && !bInCatalog) return -1
        if (!aInCatalog && bInCatalog) return 1
        return a.name.localeCompare(b.name)
      })
      setBrands(sorted)
    }
    if (categoriesRes.data) {
      // Filter categories by product type
      const catalogCategories = getCategoriesForType(formData.productType)
      const filtered = categoriesRes.data.filter(cat => catalogCategories.includes(cat.name))
      setCategories(filtered)
    }
  }

  const handleBrandChange = async (brandId: string) => {
    const selectedBrand = brands.find(b => b.id === brandId)
    if (selectedBrand) {
      const categoryInfo = getCategoryForBrand(selectedBrand.name)
      if (categoryInfo && categoryInfo.productType === formData.productType) {
        // Find the category ID
        const category = categories.find(c => c.name === categoryInfo.category)
        if (category) {
          setFormData({ ...formData, brandId, categoryId: category.id })
          return
        }
      }
    }
    setFormData({ ...formData, brandId })
  }

  const handleAddNewBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Brand name is required")
      return
    }

    const { data, error } = await supabase
      .from("brands")
      .insert({ name: newBrandName.trim() })
      .select()
      .single()

    if (error) {
      toast.error(`Error creating brand: ${error.message}`)
      return
    }

    if (data) {
      setBrands([...brands, data])
      setFormData({ ...formData, brandId: data.id })
      setNewBrandName("")
      setShowNewBrandDialog(false)
      toast.success("Brand created!")
    }
  }

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required")
      return
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({ name: newCategoryName.trim() })
      .select()
      .single()

    if (error) {
      toast.error(`Error creating category: ${error.message}`)
      return
    }

    if (data) {
      setCategories([...categories, data])
      setFormData({ ...formData, categoryId: data.id })
      setNewCategoryName("")
      setShowNewCategoryDialog(false)
      toast.success("Category created!")
    }
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="brand" className="font-sans">Brand *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewBrandDialog(true)}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add New
                  </Button>
                </div>
                <Select
                  value={formData.brandId}
                  onValueChange={handleBrandChange}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="category" className="font-sans">Category *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCategoryDialog(true)}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add New
                  </Button>
                </div>
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

      <Dialog open={showNewBrandDialog} onOpenChange={setShowNewBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
            <DialogDescription>Create a new brand that's not in the catalog</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newBrand">Brand Name</Label>
              <Input
                id="newBrand"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Enter brand name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddNewBrand()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewBrandDialog(false)
              setNewBrandName("")
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddNewBrand}>Add Brand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category for {formData.productType === 'liquor' ? 'liquor' : 'beverage'} products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCategory">Category Name</Label>
              <Input
                id="newCategory"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddNewCategory()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewCategoryDialog(false)
              setNewCategoryName("")
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddNewCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

