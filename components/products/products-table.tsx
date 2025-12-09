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
import { Search } from "lucide-react"
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
                
                const prices = variants.map((v) => v.price)
                const minPrice = prices.length > 0 ? Math.min(...prices) : null
                const maxPrice = prices.length > 0 ? Math.max(...prices) : null

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
                      {minPrice !== null && maxPrice !== null
                        ? (minPrice === maxPrice
                            ? formatCurrency(minPrice)
                            : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`)
                        : 'No pricing'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <ProductActions productId={product.id} productName={product.brands?.name || 'Product'} onDeleted={onProductDeleted} />
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

function ProductActions({ productId, productName, onDeleted }: { productId: string, productName: string, onDeleted?: () => void }) {
  const handleEdit = () => {
    window.location.href = `/products/${productId}`
  }

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
        onDeleted()
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Failed to delete product")
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleEdit}
      >
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  )
}

