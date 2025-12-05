"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Receipt, 
  Warehouse, 
  CreditCard,
  Users,
  FileText,
  Settings,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/types/supabase"

const allNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "staff"] as UserRole[] },
  { href: "/products", label: "Products", icon: Package, roles: ["admin", "manager", "staff"] as UserRole[] },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["admin", "manager", "staff"] as UserRole[] },
  { href: "/receiving", label: "Receiving", icon: Receipt, roles: ["admin", "manager", "staff"] as UserRole[] },
  { href: "/inventory", label: "Inventory", icon: Warehouse, roles: ["admin", "manager"] as UserRole[] },
  { href: "/pos", label: "POS / Quick Sale", icon: CreditCard, roles: ["admin", "manager", "staff"] as UserRole[] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "manager", "staff"] as UserRole[] },
  { href: "/reports", label: "Reports", icon: FileText, roles: ["admin", "manager"] as UserRole[] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "manager", "staff"] as UserRole[] },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  userRole?: UserRole
}

export function Sidebar({ isOpen, onClose, userRole = "staff" }: SidebarProps) {
  const pathname = usePathname()

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => item.roles.includes(userRole))

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isOpen && onClose) {
      onClose()
    }
  }, [pathname])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-gold/50 glass-strong min-h-screen p-4 transition-transform duration-300 ease-in-out shadow-depth-lg",
          // On mobile: hide by default, show when isOpen is true
          // On desktop (md+): always visible
          isOpen === true ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Close button for mobile */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <span className="text-lg font-sans font-bold text-gold">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gold hover:bg-gold/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-sans",
                  isActive
                    ? "bg-gold text-black"
                    : "text-muted-foreground hover:bg-gold/10 hover:text-gold"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium font-sans">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

