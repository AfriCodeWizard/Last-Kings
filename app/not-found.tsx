import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Crown } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Crown className="h-16 w-16 text-gold mx-auto" />
        <h1 className="text-4xl font-sans font-bold text-white">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Link href="/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

