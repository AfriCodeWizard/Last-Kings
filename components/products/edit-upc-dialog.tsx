"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { ScanLine } from "lucide-react"
import { BarcodeScanner } from "@/components/barcode-scanner"

interface EditUPCDialogProps {
  variantId: string
  currentUPC: string | null
  productName: string
  sizeMl: number
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function EditUPCDialog({
  variantId,
  currentUPC,
  productName,
  sizeMl,
  isOpen,
  onClose,
  onUpdate,
}: EditUPCDialogProps) {
  const [upc, setUpc] = useState(currentUPC || "")
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await ((supabase
        .from("product_variants") as any)
        .update({ upc: upc.trim() || null })
        .eq("id", variantId))

      if (error) throw error

      toast.success("UPC updated successfully!")
      onUpdate()
      onClose()
      setUpc("")
    } catch (error: any) {
      console.error("Error updating UPC:", error)
      toast.error(`Error updating UPC: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-sans">Edit UPC / Barcode</DialogTitle>
            <DialogDescription className="font-sans">
              Update the barcode for {productName} ({sizeMl}ml)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="upc" className="font-sans">UPC / Barcode</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gold" />
                    <Input
                      id="upc"
                      value={upc}
                      onChange={(e) => setUpc(e.target.value)}
                      placeholder="Enter or scan barcode..."
                      className="pl-10 font-sans"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="bg-gold text-black hover:bg-gold/90 font-sans"
                  >
                    Scan
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  Scan the barcode from the bottle or enter it manually
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} className="font-sans">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="font-sans">
                {loading ? "Updating..." : "Update UPC"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={async (barcode) => {
          setUpc(barcode)
          setShowScanner(false)
        }}
        title="Scan Barcode"
        description="Position the barcode on the liquor bottle within the frame"
      />
    </>
  )
}

