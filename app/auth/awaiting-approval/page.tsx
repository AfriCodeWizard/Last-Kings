"use client"

import { useEffect } from "react"
import { Crown, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function AwaitingApprovalPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is approved periodically
    const checkApprovalStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("is_approved, role")
          .eq("id", user.id)
          .single()

        const userTyped = userData as { is_approved: boolean; role: string } | null
        if (userTyped?.is_approved || userTyped?.role === 'admin') {
          router.push("/dashboard")
        }
      }
    }

    // Check immediately
    checkApprovalStatus()

    // Check every 5 seconds
    const interval = setInterval(checkApprovalStatus, 5000)

    return () => clearInterval(interval)
  }, [router])

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
            Account Awaiting Approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6">
            <Clock className="h-16 w-16 text-gold mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Your account is pending approval</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Your account has been created successfully, but it requires administrator approval before you can access the system.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              You will be automatically redirected once your account is approved. This page will refresh periodically.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push("/auth/login")
              }}
            >
              Sign Out
            </Button>
            <Button
              className="flex-1 bg-gold text-black hover:bg-gold/90"
              onClick={() => router.refresh()}
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

