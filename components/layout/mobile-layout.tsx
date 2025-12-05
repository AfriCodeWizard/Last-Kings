"use client"

import { useState } from "react"
import { Navbar } from "./navbar"
import { Sidebar } from "./sidebar"
import type { UserRole } from "@/types/supabase"

interface MobileLayoutProps {
  children: React.ReactNode
  userRole?: UserRole
}

export function MobileLayout({ children, userRole = "staff" }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex relative pt-16">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          userRole={userRole}
        />
        <div className="flex-1 w-full min-w-0 md:ml-0">
          {children}
        </div>
      </div>
    </>
  )
}

