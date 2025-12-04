import { getCurrentUser } from "@/lib/auth"
import { Navbar } from "@/components/layout/navbar"
import { Sidebar } from "@/components/layout/sidebar"
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
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-4 md:p-6 w-full min-w-0">{children}</main>
          </div>
        </MobileLayout>
      </div>
    )
  } catch (error) {
    // If there's an error getting user, redirect to login
    redirect("/auth/login")
  }
}

