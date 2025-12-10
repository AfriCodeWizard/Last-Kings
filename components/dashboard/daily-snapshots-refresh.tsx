"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DailySnapshotsRefreshProps {
  date?: string
  onRefresh?: () => void
}

export function DailySnapshotsRefresh({ date, onRefresh }: DailySnapshotsRefreshProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const targetDate = date || new Date().toISOString().split('T')[0]
      const response = await fetch('/api/daily-snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: targetDate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to refresh snapshots')
      }

      await response.json()
      toast({
        title: "Snapshots Updated",
        description: `Daily snapshots calculated successfully for ${targetDate}`,
      })

      if (onRefresh) {
        onRefresh()
      } else {
        // Reload the page to show updated data
        window.location.reload()
      }
    } catch (error: any) {
      console.error("Error refreshing snapshots:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to refresh snapshots",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={loading}
      variant="outline"
      size="sm"
      className="font-sans"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Calculating...' : 'Refresh Snapshots'}
    </Button>
  )
}

