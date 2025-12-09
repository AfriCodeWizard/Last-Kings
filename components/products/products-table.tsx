"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { UserRole } from "@/types/supabase"

// Note: Image component requires Next.js Image optimization
// For production, ensure images are hosted and accessible
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Edit, Save, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null
  product_type?: 'liquor' | 'beverage'
  brands: { name: string }
  categories: { name: string }
  product_variants: Array<{
    id: string
    size_ml: number
    sku: string
    price: number
    cost: number
  }>
}

interface ProductsTableProps {
  products: Product[]
  onProductDeleted?: () => void
}

export function ProductsTable({ products, onProductDeleted }: ProductsTableProps) {
  const [search, setSearch] = useState("")
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()
        if (userData) {
          setUserRole((userData as { role: UserRole }).role)
        }
      }
    } catch (error) {
      console.error("Error loading user role:", error)
    }
  }

  const isAdmin = userRole === 'admin'

  const filteredProducts = products.filter((product) =>
    (product.product_type === 'liquor' ? 'liquor' : 'beverage').includes(search.toLowerCase()) ||
    product.brands.name.toLowerCase().includes(search.toLowerCase()) ||
    product.categories.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border border-gold/20">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Price Range</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                // Debug: Log product to see what we're getting
                if (product.brands?.name?.toLowerCase().includes('kc')) {
                  console.log('KC Product found:', {
                    id: product.id,
                    brand: product.brands?.name,
                    variants: product.product_variants,
                    variantsLength: product.product_variants?.length,
                    variantsType: typeof product.product_variants,
                    isArray: Array.isArray(product.product_variants)
                  })
                }
                
                // Handle product_variants - ensure it's an array
                const variants = Array.isArray(product.product_variants) 
                  ? product.product_variants 
                  : (product.product_variants ? [product.product_variants] : [])
                
                const sizes = variants
                  .sort((a, b) => a.size_ml - b.size_ml)
                  .map((v) => {
                    if (v.size_ml === 1000) return '1L'
                    return `${v.size_ml}ml`
                  })

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        href={`/products/${product.id}`}
                        className="flex items-center gap-3 hover:text-gold"
                      >
                        {product.image_url && (
                          <Image
                            src={product.image_url}
                            alt={product.brands?.name || 'Product'}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {product.brands?.name || 'Unknown Brand'}
                          </div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{product.brands?.name || 'Unknown'}</TableCell>
                    <TableCell>{product.categories?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {sizes.length > 0 ? sizes.join(', ') : 'No sizes'}
                    </TableCell>
                    <TableCell>
                      {variants.length > 0 ? (
                        <ProductPriceEditor 
                          variants={variants} 
                          isAdmin={isAdmin}
                          onUpdated={onProductDeleted}
                        />
                      ) : (
                        <span className="text-muted-foreground">No pricing</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <ProductDeleteAction productId={product.id} productName={product.brands?.name || 'Product'} onDeleted={onProductDeleted} />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ProductPriceEditor({ variants, isAdmin, onUpdated }: { variants: Array<{ id: string, size_ml: number, price: number }>, isAdmin: boolean, onUpdated?: () => void }) {
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [editedPrice, setEditedPrice] = useState("")
  const [saving, setSaving] = useState(false)

  const handleStartEdit = (variant: { id: string, price: number }) => {
    setEditingVariantId(variant.id)
    setEditedPrice(variant.price.toString())
  }

  const handleCancel = () => {
    setEditingVariantId(null)
    setEditedPrice("")
  }

  const handleSave = async (variantId: string) => {
    const newPrice = parseFloat(editedPrice)
    
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Please enter a valid price (0 or greater)")
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase
        .from("product_variants") as any)
        .update({ price: newPrice })
        .eq("id", variantId)

      if (error) {
        throw error
      }

      toast.success("Price updated successfully")
      setEditingVariantId(null)
      
      if (onUpdated) {
        Promise.resolve().then(() => {
          try {
            onUpdated()
          } catch (error) {
            console.error("Error in onUpdated callback:", error)
          }
        })
      }
    } catch (error: any) {
      console.error("Error updating price:", error)
      toast.error(`Error updating price: ${error.message || "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  if (variants.length === 0) {
    return <span className="text-muted-foreground">No pricing</span>
  }

  const sortedVariants = [...variants].sort((a, b) => a.size_ml - b.size_ml)
  const prices = sortedVariants.map((v) => v.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  // If only one variant, show inline editing
  if (sortedVariants.length === 1) {
    const variant = sortedVariants[0]
    const isEditing = editingVariantId === variant.id

    return (
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Input
              type="number"
              step="0.01"
              value={editedPrice}
              onChange={(e) => setEditedPrice(e.target.value)}
              className="w-24 h-8"
              min="0"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave(variant.id)
                } else if (e.key === "Escape") {
                  handleCancel()
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSave(variant.id)}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              <Save className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </>
        ) : (
          <>
            <span>{formatCurrency(variant.price)}</span>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStartEdit(variant)}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  // Multiple variants - show price range with inline editing for each
  return (
    <div className="space-y-1">
      <div className="text-sm">
        {minPrice === maxPrice
          ? formatCurrency(minPrice)
          : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`}
      </div>
      {isAdmin && (
        <div className="flex flex-wrap gap-2 text-xs">
          {sortedVariants.map((variant) => {
            const isEditing = editingVariantId === variant.id
            const sizeLabel = variant.size_ml === 1000 ? '1L' : `${variant.size_ml}ml`
            
            return (
              <div key={variant.id} className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <span className="text-muted-foreground">{sizeLabel}:</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(e.target.value)}
                      className="w-20 h-7 text-xs"
                      min="0"
                      disabled={saving}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSave(variant.id)
                        } else if (e.key === "Escape") {
                          handleCancel()
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSave(variant.id)}
                      disabled={saving}
                      className="h-7 w-7 p-0"
                    >
                      <Save className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={saving}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">{sizeLabel}: {formatCurrency(variant.price)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(variant)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProductDeleteAction({ productId, productName, onDeleted }: { productId: string, productName: string, onDeleted?: () => void }) {
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${productName}? This will also delete all associated variants, stock levels, sales, and purchase order items. This action cannot be undone.`)) {
      return
    }

    try {
      // Delete the product (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)

      if (deleteError) {
        throw deleteError
      }

      toast.success("Product deleted successfully")
      if (onDeleted) {
        Promise.resolve().then(() => {
          try {
            onDeleted()
          } catch (error) {
            console.error("Error in onDeleted callback:", error)
          }
        })
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Failed to delete product")
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
    >
      Delete
    </Button>
  )
}

