"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { getBrandsForType, getCategoryForBrand, getCategoriesForType } from "@/data/product-catalog"
import { Plus, Trash2, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Variant {
  id: string
  size_ml: number
  sku: string
  upc: string | null
  cost: number
  price: number
  allocation_only: boolean
  collectible: boolean
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false)
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false)
  const [showNewVariantDialog, setShowNewVariantDialog] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [formData, setFormData] = useState({
    brand_id: "",
    category_id: "",
    product_type: "liquor" as "liquor" | "beverage",
    description: "",
  })
  const [newVariant, setNewVariant] = useState({
    size_ml: 250,
    sku: "",
    upc: "",
    cost: 0,
    price: 0,
    allocation_only: false,
    collectible: false,
  })

  useEffect(() => {
    loadProduct()
  }, [productId])

  useEffect(() => {
    if (formData.product_type) {
      loadBrandsAndCategories()
    }
  }, [formData.product_type])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const { data: product, error } = await supabase
        .from("products")
        .select(`
          *,
          product_variants(*)
        `)
        .eq("id", productId)
        .single()

      if (error) {
        console.error("Error loading product:", error)
        toast.error("Failed to load product")
        router.push("/products")
        return
      }

      if (product) {
        const productTyped = product as {
          brand_id: string
          category_id: string
          product_type: "liquor" | "beverage"
          description: string | null
          product_variants: Variant[]
        }
        setFormData({
          brand_id: productTyped.brand_id,
          category_id: productTyped.category_id,
          product_type: productTyped.product_type,
          description: productTyped.description || "",
        })
        setVariants(productTyped.product_variants || [])
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      toast.error("Failed to load product")
      router.push("/products")
    } finally {
      setLoading(false)
    }
  }

  const loadBrandsAndCategories = async () => {
    const [brandsRes, categoriesRes] = await Promise.all([
      supabase.from("brands").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ])

    if (brandsRes.data) {
      const catalogBrands = getBrandsForType(formData.product_type)
      const allBrands = brandsRes.data as Array<{ id: string; name: string }>
      const beverageBrands = getBrandsForType('beverage')
      const liquorBrands = getBrandsForType('liquor')
      
      const filtered = allBrands.filter(brand => {
        const isLiquorBrand = liquorBrands.includes(brand.name)
        const isBeverageBrand = beverageBrands.includes(brand.name)
        
        if (formData.product_type === 'liquor') {
          return isLiquorBrand || (!isLiquorBrand && !isBeverageBrand)
        } else {
          return isBeverageBrand || (!isLiquorBrand && !isBeverageBrand)
        }
      })
      
      const sorted = filtered.sort((a, b) => {
        const aInCatalog = catalogBrands.includes(a.name)
        const bInCatalog = catalogBrands.includes(b.name)
        if (aInCatalog && !bInCatalog) return -1
        if (!aInCatalog && bInCatalog) return 1
        return a.name.localeCompare(b.name)
      })
      setBrands(sorted)
    }
    if (categoriesRes.data) {
      const catalogCategories = getCategoriesForType(formData.product_type)
      const filtered = (categoriesRes.data as Array<{ id: string; name: string }>).filter(cat => catalogCategories.includes(cat.name))
      setCategories(filtered)
    }
  }

  const handleBrandChange = async (brandId: string) => {
    const selectedBrand = brands.find(b => b.id === brandId)
    if (selectedBrand) {
      const categoryInfo = getCategoryForBrand(selectedBrand.name)
      if (categoryInfo && categoryInfo.productType === formData.product_type) {
        const category = categories.find(c => c.name === categoryInfo.category)
        if (category) {
          setFormData({ ...formData, brand_id: brandId, category_id: category.id })
          return
        }
      }
    }
    setFormData({ ...formData, brand_id: brandId })
  }

  const handleAddNewBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Brand name is required")
      return
    }

    const { data, error } = await (supabase
      .from("brands") as any)
      .insert({ name: newBrandName.trim() })
      .select()
      .single()

    if (error) {
      toast.error(`Error creating brand: ${error.message}`)
      return
    }

    if (data) {
      const newBrand = data as { id: string; name: string }
      setBrands([...brands, newBrand])
      setFormData({ ...formData, brand_id: newBrand.id })
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

    const { data, error } = await (supabase
      .from("categories") as any)
      .insert({ name: newCategoryName.trim() })
      .select()
      .single()

    if (error) {
      toast.error(`Error creating category: ${error.message}`)
      return
    }

    if (data) {
      const newCategory = data as { id: string; name: string }
      setCategories([...categories, newCategory])
      setFormData({ ...formData, category_id: newCategory.id })
      setNewCategoryName("")
      setShowNewCategoryDialog(false)
      toast.success("Category created!")
    }
  }

  const handleVariantChange = (variantId: string, field: keyof Variant, value: any) => {
    setVariants(variants.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ))
  }

  const handleAddVariant = async () => {
    if (!newVariant.sku.trim()) {
      toast.error("SKU is required")
      return
    }
    if (newVariant.price <= 0) {
      toast.error("Price must be greater than 0")
      return
    }

    // Check if UPC already exists
    if (newVariant.upc && newVariant.upc.trim()) {
      const { data: existing } = await supabase
        .from("product_variants")
        .select("id")
        .eq("upc", newVariant.upc.trim())
        .limit(1)
        .maybeSingle()

      if (existing) {
        toast.error("UPC already exists for another product")
        return
      }
    }

    // Check if SKU already exists
    const { data: existingSku } = await supabase
      .from("product_variants")
      .select("id")
      .eq("sku", newVariant.sku.trim())
      .limit(1)
      .maybeSingle()

    if (existingSku) {
      toast.error("SKU already exists")
      return
    }

    const { data, error } = await (supabase
      .from("product_variants") as any)
      .insert({
        product_id: productId,
        size_ml: newVariant.size_ml,
        sku: newVariant.sku.trim(),
        upc: newVariant.upc.trim() || null,
        cost: newVariant.cost || 0,
        price: newVariant.price,
        allocation_only: newVariant.allocation_only,
        collectible: newVariant.collectible,
      })
      .select()
      .single()

    if (error) {
      toast.error(`Error creating variant: ${error.message}`)
      return
    }

    setVariants([...variants, data as Variant])
    setNewVariant({
      size_ml: 250,
      sku: "",
      upc: "",
      cost: 0,
      price: 0,
      allocation_only: false,
      collectible: false,
    })
    setShowNewVariantDialog(false)
    toast.success("Variant added!")
  }

  const handleDeleteVariant = async (variantId: string) => {
    const { error } = await (supabase
      .from("product_variants") as any)
      .delete()
      .eq("id", variantId)

    if (error) {
      toast.error(`Error deleting variant: ${error.message}`)
      return
    }

    setVariants(variants.filter(v => v.id !== variantId))
    toast.success("Variant deleted!")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.brand_id) {
        toast.error("Please select a brand")
        setSaving(false)
        return
      }
      if (!formData.category_id) {
        toast.error("Please select a category")
        setSaving(false)
        return
      }

      // Update product
      const { error: productError } = await ((supabase.from("products") as any)
        .update({
          brand_id: formData.brand_id,
          category_id: formData.category_id,
          product_type: formData.product_type,
          description: formData.description.trim() || null,
        })
        .eq("id", productId))

      if (productError) {
        console.error("Product update error:", productError)
        toast.error(`Error updating product: ${productError.message || "Unknown error"}`)
        setSaving(false)
        return
      }

      // Update all variants
      for (const variant of variants) {
        // Check for duplicate UPC (excluding current variant)
        if (variant.upc && variant.upc.trim()) {
          const { data: existing } = await supabase
            .from("product_variants")
            .select("id")
            .eq("upc", variant.upc.trim())
            .neq("id", variant.id)
            .limit(1)
            .maybeSingle()

          if (existing) {
            toast.error(`UPC ${variant.upc} already exists for another variant`)
            setSaving(false)
            return
          }
        }

        // Check for duplicate SKU (excluding current variant)
        const { data: existingSku } = await supabase
          .from("product_variants")
          .select("id")
          .eq("sku", variant.sku.trim())
          .neq("id", variant.id)
          .limit(1)
          .maybeSingle()

        if (existingSku) {
          toast.error(`SKU ${variant.sku} already exists for another variant`)
          setSaving(false)
          return
        }

        const { error: variantError } = await ((supabase.from("product_variants") as any)
          .update({
            size_ml: variant.size_ml,
            sku: variant.sku.trim(),
            upc: variant.upc?.trim() || null,
            cost: variant.cost || 0,
            price: variant.price,
            allocation_only: variant.allocation_only,
            collectible: variant.collectible,
          })
          .eq("id", variant.id))

        if (variantError) {
          console.error("Variant update error:", variantError)
          toast.error(`Error updating variant: ${variantError.message || "Unknown error"}`)
          setSaving(false)
          return
        }
      }

      toast.success("Product updated successfully!")
      router.push(`/products/${productId}`)
    } catch (error: any) {
      console.error("Unexpected error:", error)
      toast.error(`Error updating product: ${error.message || "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading product...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-sans font-bold text-white mb-2">Edit Product</h1>
        <p className="text-muted-foreground">Update product information and variants</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>Update the product details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product_type" className="font-sans">Product Type *</Label>
                <Select
                  value={formData.product_type}
                  onValueChange={(value) => setFormData({ ...formData, product_type: value as "liquor" | "beverage" })}
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
                  value={formData.brand_id}
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
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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
              <div className="space-y-2">
                <Label htmlFor="description" className="font-sans">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="font-sans"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription>Sizes, prices, and UPC codes</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewVariantDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {variants.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size (ml)</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>UPC</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Collectible</TableHead>
                        <TableHead>Allocation Only</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <TableRow key={variant.id}>
                          <TableCell>
                            <Input
                              type="number"
                              value={variant.size_ml}
                              onChange={(e) => handleVariantChange(variant.id, "size_ml", parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variant.sku}
                              onChange={(e) => handleVariantChange(variant.id, "sku", e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variant.upc || ""}
                              onChange={(e) => handleVariantChange(variant.id, "upc", e.target.value)}
                              className="w-32"
                              placeholder="Optional"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.cost}
                              onChange={(e) => handleVariantChange(variant.id, "cost", parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.price}
                              onChange={(e) => handleVariantChange(variant.id, "price", parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={variant.collectible}
                              onChange={(e) => handleVariantChange(variant.id, "collectible", e.target.checked)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={variant.allocation_only}
                              onChange={(e) => handleVariantChange(variant.id, "allocation_only", e.target.checked)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Variant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this variant? This will also delete all associated stock levels and sales. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteVariant(variant.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No variants found. Add a variant to get started.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/products/${productId}`)}>
              Cancel
            </Button>
          </div>
        </div>
      </form>

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
            <DialogDescription>Create a new category for {formData.product_type === 'liquor' ? 'liquor' : 'beverage'} products</DialogDescription>
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

      <Dialog open={showNewVariantDialog} onOpenChange={setShowNewVariantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variant</DialogTitle>
            <DialogDescription>Add a new size/variant for this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variantSize">Size (ml) *</Label>
              <Input
                id="variantSize"
                type="number"
                value={newVariant.size_ml}
                onChange={(e) => setNewVariant({ ...newVariant, size_ml: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variantSku">SKU *</Label>
              <Input
                id="variantSku"
                value={newVariant.sku}
                onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variantUpc">UPC (Optional)</Label>
              <Input
                id="variantUpc"
                value={newVariant.upc}
                onChange={(e) => setNewVariant({ ...newVariant, upc: e.target.value })}
                placeholder="Barcode/UPC code"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variantCost">Cost</Label>
                <Input
                  id="variantCost"
                  type="number"
                  step="0.01"
                  value={newVariant.cost}
                  onChange={(e) => setNewVariant({ ...newVariant, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variantPrice">Price *</Label>
                <Input
                  id="variantPrice"
                  type="number"
                  step="0.01"
                  value={newVariant.price}
                  onChange={(e) => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="variantCollectible"
                  checked={newVariant.collectible}
                  onChange={(e) => setNewVariant({ ...newVariant, collectible: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="variantCollectible">Collectible</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="variantAllocation"
                  checked={newVariant.allocation_only}
                  onChange={(e) => setNewVariant({ ...newVariant, allocation_only: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="variantAllocation">Allocation Only</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewVariantDialog(false)
              setNewVariant({
                size_ml: 250,
                sku: "",
                upc: "",
                cost: 0,
                price: 0,
                allocation_only: false,
                collectible: false,
              })
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddVariant}>Add Variant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
