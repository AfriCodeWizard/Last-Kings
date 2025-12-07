"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Crown, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { UserRole } from "@/types/supabase"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<UserRole>("staff")
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Admin users are auto-approved, others need approval
        const isApproved = role === 'admin'
        
        const { error: userError } = await ((supabase.from("users") as any).insert({
            id: authData.user.id,
            email,
            full_name: fullName,
            role,
            is_approved: isApproved,
          }))

        if (userError) throw userError

        if (isApproved) {
          toast.success("Account created! Please sign in.")
          router.push("/auth/login")
        } else {
          // Redirect to awaiting approval page after email confirmation
          toast.success("Account created! Please check your email to confirm your account.")
          router.push("/auth/awaiting-approval")
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="h-10 w-10 text-gold flex-shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <CardTitle className="text-3xl font-serif text-gold">Last Kings</CardTitle>
              <span className="text-sm font-serif text-white -mt-1">liquor store</span>
            </div>
          </div>
          <CardDescription className="text-muted-foreground mt-2">
            Create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gold hover:text-gold/80"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>
          <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
            <div>
              Already have an account?{" "}
              <Link href="/auth/login" className="text-gold hover:underline">
                Sign in
              </Link>
            </div>
            <div>
              Need to create an admin account?{" "}
              <Link href="/auth/register-admin" className="text-gold hover:underline">
                Admin Registration
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

