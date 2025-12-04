"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { syncSessionToCookies } from "@/lib/auth-sync"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)



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
          // Check if user exists and email is confirmed
          const { data: checkUser } = await supabase.auth.admin?.getUserByEmail(email.trim()).catch(() => null)
          
          if (checkUser) {
            console.log("User exists but login failed. Email confirmed:", checkUser.user?.email_confirmed_at)
            throw new Error("Invalid password. If you just registered, please check your email for confirmation or reset your password.")
          }
          
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
      
      // Provide more helpful error messages
      if (errorMessage.includes("Invalid login credentials")) {
        toast.error("Invalid email or password")
      } else if (errorMessage.includes("Email not confirmed")) {
        toast.error("Please check your email and confirm your account")
      } else {
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
          <div className="flex justify-center mb-4">
            <Crown className="h-12 w-12 text-gold" />
          </div>
          <CardTitle className="text-3xl font-serif text-gold">Last Kings</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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

