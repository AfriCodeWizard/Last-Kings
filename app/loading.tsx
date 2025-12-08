import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoadingSpinner message="Loading..." />
    </div>
  )
}

