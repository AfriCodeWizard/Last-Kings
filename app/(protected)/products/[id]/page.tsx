import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { UPCDialogWrapper } from "@/components/products/upc-dialog-wrapper"

// Note: Image component requires Next.js Image optimization
import { formatCurrency } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { canViewCosts } from "@/lib/auth"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      brands(name),
      categories(name),
      product_variants(*)
    `)
    .eq("id", id)
    .single()

  if (!product) {
    notFound()
  }

  const showCosts = user ? canViewCosts(user.role) : false

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-sans font-bold text-white mb-2">{product.name}</h1>
          <p className="text-muted-foreground">
            {product.brands.name} • {product.categories.name}
          </p>
        </div>
        <Link href={`/products/${id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Product
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.image_url && (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gold/20">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Available sizes and pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.product_variants.map((variant: {
                id: string
                size_ml: number
                sku: string
                upc: string | null
                price: number
                cost: number
                allocation_only: boolean
                collectible: boolean
              }) => (
                <div
                  key={variant.id}
                  className="flex justify-between items-center p-4 rounded-lg border border-gold/10"
                >
                  <div className="flex-1">
                    <div className="font-medium font-sans">{variant.size_ml}ml</div>
                    <div className="text-sm text-muted-foreground font-sans">
                      SKU: {variant.sku}
                      {variant.upc && ` • UPC: ${variant.upc}`}
                      {!variant.upc && ` • No UPC assigned`}
                    </div>
                    {variant.collectible && (
                      <div className="text-xs text-gold mt-1 font-sans">Collectible</div>
                    )}
                    {variant.allocation_only && (
                      <div className="text-xs text-gold-light mt-1 font-sans">Allocation Only</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-gold font-sans">{formatCurrency(variant.price)}</div>
                      {showCosts && (
                        <div className="text-sm text-muted-foreground font-sans">
                          Cost: {formatCurrency(variant.cost)}
                        </div>
                      )}
                    </div>
                    <UPCDialogWrapper
                      variant={variant}
                      productName={product.name}
                      onUpdate={() => window.location.reload()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

