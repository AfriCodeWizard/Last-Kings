import { getCurrentUser } from "@/lib/auth"
import { Navbar } from "@/components/layout/navbar"
import { Sidebar } from "@/components/layout/sidebar"
import { SessionSync } from "@/components/auth/session-sync"
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
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    )
  } catch (error) {
    // If there's an error getting user, redirect to login
    redirect("/auth/login")
  }
}

