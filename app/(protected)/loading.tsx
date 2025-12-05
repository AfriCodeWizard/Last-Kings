import { Crown } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div style={{ perspective: "1000px" }} className="inline-block">
          <Crown 
            className="h-12 w-12 text-gold mx-auto animate-flip" 
            style={{ transformStyle: "preserve-3d", display: "inline-block" }} 
          />
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

