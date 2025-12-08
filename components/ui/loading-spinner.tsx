import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  message?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
}

export function LoadingSpinner({ 
  message = "Loading...", 
  className,
  size = "md"
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div style={{ perspective: "1000px" }} className="inline-block">
        <Crown 
          className={cn(
            "text-gold mx-auto animate-flip",
            sizeClasses[size]
          )}
          style={{ transformStyle: "preserve-3d", display: "inline-block" }}
        />
      </div>
      {message && (
        <p className="text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  )
}

