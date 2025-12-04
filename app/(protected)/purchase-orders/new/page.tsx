"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NewPurchaseOrderPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-gold mb-2">New Purchase Order</h1>
        <p className="text-muted-foreground">Create a new purchase order</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order</CardTitle>
          <CardDescription>Create a new PO</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Purchase order creation form coming soon...</p>
          <Button onClick={() => router.back()} className="mt-4">
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

