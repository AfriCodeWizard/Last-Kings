"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

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
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [search, setSearch] = useState("")

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                // Handle empty product_variants array
                const validVariants = product.product_variants?.filter((v) => v && typeof v.price === 'number' && !isNaN(v.price)) || []
                const sizes = validVariants
                  .sort((a, b) => a.size_ml - b.size_ml)
                  .map((v) => {
                    if (v.size_ml === 1000) return '1L'
                    return `${v.size_ml}ml`
                  })
                
                const prices = validVariants.map((v) => v.price)
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

