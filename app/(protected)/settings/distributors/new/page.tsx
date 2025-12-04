"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function NewDistributorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error("Distributor name is required")
        setLoading(false)
        return
      }

      const { error } = await ((supabase.from("distributors") as any).insert({
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
      }))

      if (error) {
        console.error("Error creating distributor:", error)
        toast.error(`Error creating distributor: ${error.message || "Unknown error"}`)
        setLoading(false)
        return
      }

      toast.success("Distributor created successfully!")
      router.push("/settings")
    } catch (error: any) {
      console.error("Unexpected error:", error)
      toast.error(`Error creating distributor: ${error.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">New Distributor</h1>
        <p className="text-sm md:text-base text-muted-foreground">Add a new supplier/distributor</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans">Distributor Information</CardTitle>
          <CardDescription className="font-sans">Enter distributor details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-sans">Distributor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ABC Liquor Distributors"
                required
                className="font-sans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="font-sans">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g., John Doe"
                className="font-sans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-sans">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., orders@distributor.com"
                className="font-sans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="font-sans">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +254712345678"
                className="font-sans"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="font-sans">
                {loading ? "Creating..." : "Create Distributor"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} className="font-sans">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

