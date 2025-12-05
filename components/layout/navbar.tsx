"use client"

import Link from "next/link"
import { Crown, LogOut, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <nav className="border-b border-gold/50 glass-strong sticky top-0 z-50 bg-black/95 backdrop-blur-xl shadow-depth">
      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger menu button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden text-gold hover:bg-gold/10"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <Link href="/dashboard" className="flex items-center gap-2">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-gold" />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-serif font-bold text-gold">Last Kings</span>
              <span className="text-xs sm:text-sm font-sans text-gold/70 -mt-1">liquor store</span>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}

