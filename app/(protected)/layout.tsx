import { getCurrentUser } from "@/lib/auth"
import { SessionSync } from "@/components/auth/session-sync"
import { MobileLayout } from "@/components/layout/mobile-layout"
import { redirect } from "next/navigation"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      redirect("/auth/login")
    }

    return (
      <div className="min-h-screen bg-black">
        <SessionSync />
        <MobileLayout>
          <main className="flex-1 p-3 sm:p-4 md:p-6 w-full min-w-0 overflow-x-hidden">{children}</main>
        </MobileLayout>
      </div>
    )
  } catch (error) {
    // If there's an error getting user, redirect to login
    redirect("/auth/login")
  }
}

