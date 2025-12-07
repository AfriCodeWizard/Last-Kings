"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

// Admin invitation code - should be stored in environment variable in production
const ADMIN_INVITATION_CODE = process.env.NEXT_PUBLIC_ADMIN_INVITATION_CODE || "ADMIN2024"

export default function AdminRegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [invitationCode, setInvitationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)

  const verifyInvitationCode = () => {
    if (invitationCode === ADMIN_INVITATION_CODE) {
      setCodeVerified(true)
      toast.success("Invitation code verified")
    } else {
      toast.error("Invalid invitation code")
      setCodeVerified(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!codeVerified) {
      toast.error("Please verify the invitation code first")
      return
    }

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
        // Admin users are auto-approved
        const { error: userError } = await ((supabase.from("users") as any).insert({
            id: authData.user.id,
            email,
            full_name: fullName,
            role: 'admin',
            is_approved: true,
          }))

        if (userError) throw userError

        toast.success("Admin account created! Please sign in.")
        router.push("/auth/login")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create admin account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-gold flex-shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <CardTitle className="text-3xl font-serif text-gold">Last Kings</CardTitle>
              <span className="text-sm font-serif text-white -mt-1">Admin Registration</span>
            </div>
          </div>
          <CardDescription className="text-muted-foreground mt-2">
            Create an administrator account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitationCode">Admin Invitation Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="invitationCode"
                  type="text"
                  placeholder="Enter invitation code"
                  value={invitationCode}
                  onChange={(e) => {
                    setInvitationCode(e.target.value)
                    setCodeVerified(false)
                  }}
                  required
                  disabled={codeVerified}
                  className={codeVerified ? "bg-gold/10 border-gold" : ""}
                />
                {!codeVerified && (
                  <Button
                    type="button"
                    onClick={verifyInvitationCode}
                    className="bg-gold text-black hover:bg-gold/90"
                  >
                    Verify
                  </Button>
                )}
                {codeVerified && (
                  <div className="flex items-center px-3 text-gold">
                    <Shield className="h-4 w-4" />
                  </div>
                )}
              </div>
              {codeVerified && (
                <p className="text-xs text-green-500">✓ Code verified</p>
              )}
            </div>

            {codeVerified && (
              <>
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
                    placeholder="admin@example.com"
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
                <Button type="submit" className="w-full bg-gold text-black hover:bg-gold/90" disabled={loading}>
                  {loading ? "Creating admin account..." : "Register as Admin"}
                </Button>
              </>
            )}
          </form>
          <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
            <div>
              Need a regular account?{" "}
              <Link href="/auth/register" className="text-gold hover:underline">
                Register here
              </Link>
            </div>
            <div>
              Already have an account?{" "}
              <Link href="/auth/login" className="text-gold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

