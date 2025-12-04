"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Database } from "@/types/supabase"

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"]

// Form state type - uses strings instead of nullable types for inputs
type CustomerFormData = {
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  is_whale: boolean
}

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    is_whale: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Prepare data for insert - convert empty strings to null for optional fields
      const insertData: CustomerInsert = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        date_of_birth: formData.date_of_birth.trim() || null,
        is_whale: formData.is_whale,
      }

      // Type assertion to work around TypeScript inference issue during build
      // The data is correctly typed, but TypeScript can't infer it from the Supabase client in build environment
      const { error } = await (supabase.from("customers") as any).insert(insertData)

      if (error) throw error

      toast.success("Customer created!")
      router.push("/customers")
    } catch (error) {
      toast.error("Error creating customer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-gold mb-2">New Customer</h1>
        <p className="text-muted-foreground">Add a new customer profile</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>Enter customer details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_whale"
                checked={formData.is_whale}
                onCheckedChange={(checked) => setFormData({ ...formData, is_whale: checked as boolean })}
              />
              <Label htmlFor="is_whale" className="cursor-pointer">
                VIP / Whale Customer (eligible for allocations)
              </Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Customer"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

