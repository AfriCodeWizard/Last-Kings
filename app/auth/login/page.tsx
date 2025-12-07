"use client"

import { useState } from "react"
import Link from "next/link"
import { Crown, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { syncSessionToCookies } from "@/lib/auth-sync"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("Attempting login with email:", email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error("Login error:", error)
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          name: error.name
        })
        
        // Check for specific error types
        if (error.message.includes("Invalid login credentials")) {
          // Note: getUserByEmail doesn't exist in Supabase admin API
          // Email confirmation status cannot be checked without admin API
          throw new Error("Invalid email or password. Please check your credentials.")
        }
        
        if (error.message.includes("Email not confirmed")) {
          throw new Error("Please check your email and confirm your account before logging in.")
        }
        
        throw error
      }

      if (!data.user) {
        throw new Error("No user data returned")
      }

      console.log("Login successful, user ID:", data.user.id)
      console.log("Email confirmed:", data.user.email_confirmed_at)

      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (userError) {
        console.error("Error checking users table:", userError)
        // If user doesn't exist in users table, create it
        if (userError.code === 'PGRST116') {
          console.log("User not in users table, creating record...")
          const { error: createError } = await ((supabase.from("users") as any).insert({
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || null,
              role: data.user.user_metadata?.role || 'staff',
            }))

          if (createError) {
            console.error("Error creating user record:", createError)
            toast.error("User account not properly set up. Please contact administrator.")
            await supabase.auth.signOut()
            return
          }
        } else {
          toast.error("Error accessing user data. Please try again.")
          await supabase.auth.signOut()
          return
        }
      }

      if (!userData && userError?.code !== 'PGRST116') {
        console.error("User not found in users table")
        toast.error("User account not properly set up. Please contact administrator.")
        await supabase.auth.signOut()
        return
      }

      // Check if user is approved (admins are always approved)
      const finalUserData = (userData || await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single()
        .then(({ data }) => data)) as { is_approved: boolean; role: string } | null

      if (!finalUserData) {
        toast.error("User account not found. Please contact administrator.")
        await supabase.auth.signOut()
        return
      }

      // If user is not approved and not admin, redirect to awaiting approval page
      if (!finalUserData.is_approved && finalUserData.role !== 'admin') {
        console.log("User not approved, redirecting to awaiting approval page")
        await supabase.auth.signOut()
        window.location.href = "/auth/awaiting-approval"
        return
      }

      console.log("User authenticated successfully")
      
      // CRITICAL: Sync session to cookies so middleware can read it
      const synced = await syncSessionToCookies()
      console.log("Session synced to cookies:", synced)
      
      if (!synced) {
        console.warn("Session sync failed, but proceeding with redirect")
      }
      
      toast.success("Welcome back!")
      
      // Wait a moment for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Redirect to dashboard
      window.location.href = "/dashboard"
    } catch (error) {
      console.error("Login failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to sign in"
      
      // Set error state for display
      if (errorMessage.includes("Invalid login credentials") || errorMessage.includes("Invalid email or password")) {
        setLoginError("Incorrect credentials. Please check your email and password and try again.")
        toast.error("Invalid email or password")
      } else if (errorMessage.includes("Email not confirmed")) {
        setLoginError("Please check your email and confirm your account before logging in.")
        toast.error("Please check your email and confirm your account")
      } else {
        setLoginError(errorMessage)
        toast.error(errorMessage)
      }
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
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginError && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <div className="font-medium">⚠️ {loginError}</div>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setLoginError(null) // Clear error when user starts typing
                }}
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
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setLoginError(null) // Clear error when user starts typing
                  }}
                  required
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
            <div>
              Don't have an account?{" "}
              <Link href="/auth/register" className="text-gold hover:underline">
                Register
              </Link>
            </div>
            <div>
              Forgot password?{" "}
              <Link href="/auth/reset-password" className="text-gold hover:underline">
                Reset Password
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

