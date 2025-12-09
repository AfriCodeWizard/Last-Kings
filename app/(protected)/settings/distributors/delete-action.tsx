"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DeleteDistributorActionProps {
  distributorId: string
  distributorName: string
  userRole: string
}

export function DeleteDistributorAction({ 
  distributorId, 
  distributorName,
  userRole 
}: DeleteDistributorActionProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Only show delete button for admins
  if (userRole !== 'admin') {
    return null
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      // Check if distributor has any purchase orders
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select("id")
        .eq("distributor_id", distributorId)
        .limit(1)

      if (poError) {
        throw poError
      }

      if (poData && poData.length > 0) {
        toast.error("Cannot delete distributor with existing purchase orders")
        setLoading(false)
        return
      }

      // Delete the distributor
      const { error } = await (supabase.from("distributors") as any)
        .delete()
        .eq("id", distributorId)

      if (error) {
        throw error
      }

      toast.success("Distributor deleted successfully")
      // Use setTimeout to avoid server component errors
      setTimeout(() => {
        router.refresh()
      }, 0)
    } catch (error: any) {
      console.error("Error deleting distributor:", error)
      toast.error(`Error deleting distributor: ${error.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={loading}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Distributor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{distributorName}</strong>? This action cannot be undone.
            <br />
            <br />
            Note: Distributors with existing purchase orders cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

