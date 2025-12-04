"use client"

import { useState } from "react"
import { Navbar } from "./navbar"
import { Sidebar } from "./sidebar"

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex relative">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        <div className="flex-1 w-full min-w-0 md:ml-0">
          {children}
        </div>
      </div>
    </>
  )
}

