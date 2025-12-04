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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/receiving", label: "Receiving", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/pos", label: "POS / Quick Sale", icon: CreditCard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

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
          "fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-gold/20 glass min-h-screen p-4 transition-transform duration-300 ease-in-out",
          // On mobile: hide by default, show when isOpen is true
          // On desktop (md+): always visible
          isOpen === true ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Close button for mobile */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <span className="text-lg font-serif font-bold text-gold">Menu</span>
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
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-gold/20 text-gold border border-gold/30"
                    : "text-muted-foreground hover:bg-gold/10 hover:text-gold"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

