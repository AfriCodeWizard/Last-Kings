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
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false)
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [formData, setFormData] = useState({
    brand_id: "",
    category_id: "",
    product_type: "liquor" as "liquor" | "beverage",
    description: "",
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
        .select("*")
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
        }
        setFormData({
          brand_id: productTyped.brand_id,
          category_id: productTyped.category_id,
          product_type: productTyped.product_type,
          description: productTyped.description || "",
        })
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
      // Get catalog brands for the selected product type
      const catalogBrands = getBrandsForType(formData.product_type)
      
      // Filter brands: only show brands that match the product type
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
      
      // Sort brands: catalog brands first, then others
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
      // Filter categories by product type
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
        // Find the category ID
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate required fields
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

      const { error } = await ((supabase.from("products") as any)
        .update({
          brand_id: formData.brand_id,
          category_id: formData.category_id,
          product_type: formData.product_type,
          description: formData.description.trim() || null,
        })
        .eq("id", productId))

      if (error) {
        console.error("Product update error:", error)
        toast.error(`Error updating product: ${error.message || "Unknown error"}`)
        return
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
        <p className="text-muted-foreground">Update product information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>Update the product details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push(`/products/${productId}`)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
    </div>
  )
}


