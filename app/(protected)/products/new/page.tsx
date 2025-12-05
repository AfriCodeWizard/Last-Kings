"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    loadBrandsAndCategories()
  }, [formData.product_type])

  const loadBrandsAndCategories = async () => {
    const [brandsRes, categoriesRes] = await Promise.all([
      supabase.from("brands").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ])

    if (brandsRes.data) {
      // Sort brands: catalog brands first, then others
      const catalogBrands = getBrandsForType(formData.product_type)
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
      const catalogCategories = getCategoriesForType(formData.product_type)
      const filtered = categoriesRes.data.filter(cat => catalogCategories.includes(cat.name))
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
      setFormData({ ...formData, brand_id: data.id })
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
      setFormData({ ...formData, category_id: data.id })
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
      if (!formData.brand_id) {
        toast.error("Please select a brand")
        setLoading(false)
        return
      }
      if (!formData.category_id) {
        toast.error("Please select a category")
        setLoading(false)
        return
      }

      const { error } = await ((supabase.from("products") as any).insert({
        brand_id: formData.brand_id,
        category_id: formData.category_id,
        product_type: formData.product_type,
        description: formData.description.trim() || null,
      }).select().single())

      if (error) {
        console.error("Product creation error:", error)
        toast.error(`Error creating product: ${error.message || "Unknown error"}`)
        return
      }

      toast.success("Product created!")
      router.push("/products")
    } catch (error: any) {
      console.error("Unexpected error:", error)
      toast.error(`Error creating product: ${error.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-sans font-bold text-white mb-2">New Product</h1>
        <p className="text-muted-foreground">Add a new product to the catalog</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>Enter the product details</CardDescription>
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
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Product"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
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

