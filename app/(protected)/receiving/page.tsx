"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanLine, CheckCircle2, X } from "lucide-react"
import { playScanBeep } from "@/lib/sound"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ScannedItem {
  variant_id: string
  product_name: string
  size_ml: number
  quantity: number
  lot_number: string | null
  expiry_date: string | null
}

export default function ReceivingPage() {
  const [barcode, setBarcode] = useState("")
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [showLotModal, setShowLotModal] = useState(false)
  const [currentItem, setCurrentItem] = useState<ScannedItem | null>(null)
  const [lotNumber, setLotNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleBarcodeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) return

    // Simulate barcode scanner (usually sends Enter after scan)
    if (value.length > 8) {
      processBarcode(value)
      setBarcode("")
    }
  }

  const processBarcode = async (upc: string) => {
    try {
      const { data: variant, error } = await ((supabase
        .from("product_variants")
        .select(`
          id,
          upc,
          size_ml,
          products!inner(name)
        `)
        .eq("upc", upc)
        .single() as any))

      if (error || !variant) {
        toast.error("Product not found")
        return
      }

      playScanBeep()

      const variantTyped = variant as any
      const existingItem = scannedItems.find((item) => item.variant_id === variantTyped.id)

      if (existingItem) {
        setScannedItems((prev) =>
          prev.map((item) =>
            item.variant_id === variantTyped.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
        toast.success(`${variantTyped.products.name} quantity increased`)
      } else {
        const newItem: ScannedItem = {
          variant_id: variantTyped.id,
          product_name: variantTyped.products.name,
          size_ml: variantTyped.size_ml,
          quantity: 1,
          lot_number: null,
          expiry_date: null,
        }
        setScannedItems((prev) => [...prev, newItem])
        setCurrentItem(newItem)
        setShowLotModal(true)
        toast.success(`${variantTyped.products.name} added`)
      }
    } catch (error) {
      toast.error("Error processing barcode")
    }
  }

  const handleSaveLot = () => {
    if (!currentItem) return

    setScannedItems((prev) =>
      prev.map((item) =>
        item.variant_id === currentItem.variant_id
          ? {
              ...item,
              lot_number: lotNumber || null,
              expiry_date: expiryDate || null,
            }
          : item
      )
    )

    setShowLotModal(false)
    setCurrentItem(null)
    setLotNumber("")
    setExpiryDate("")
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleCompleteReceiving = async () => {
    if (scannedItems.length === 0) {
      toast.error("No items to receive")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }

      // Create receiving session
      const { data: session, error: sessionError } = await ((supabase.from("receiving_sessions") as any)
        .insert({
          received_by: user.id,
          status: "in_progress",
        })
        .select()
        .single())

      if (sessionError) throw sessionError

      // Get default location
      const { data: location } = await ((supabase
        .from("inventory_locations")
        .select("id")
        .eq("type", "warehouse")
        .limit(1)
        .single() as any))

      if (!location) {
        toast.error("No warehouse location found")
        return
      }

      // Insert received items
      const receivedItems = scannedItems.map((item) => ({
        session_id: session.id,
        variant_id: item.variant_id,
        location_id: (location as any).id,
        quantity: item.quantity,
        lot_number: item.lot_number,
        expiry_date: item.expiry_date,
      }))

      const { error: itemsError } = await ((supabase.from("received_items") as any).insert(receivedItems))

      if (itemsError) throw itemsError

      // Complete session
      await ((supabase.from("receiving_sessions") as any)
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", session.id))

      toast.success("Receiving session completed!")
      setScannedItems([])
    } catch (error) {
      toast.error("Error completing receiving session")
      console.error(error)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-serif font-bold text-gold mb-2">Receiving</h1>
        <p className="text-sm md:text-base text-muted-foreground">Scan items to receive inventory</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scan Items</CardTitle>
            <CardDescription>Use barcode scanner or enter UPC manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode / UPC</Label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gold" />
                <Input
                  id="barcode"
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value)
                    handleBarcodeScan(e)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && barcode.trim()) {
                      processBarcode(barcode.trim())
                      setBarcode("")
                    }
                  }}
                  placeholder="Scan or enter barcode..."
                  className="pl-10 text-lg"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsScanning(!isScanning)}
                className={isScanning ? "animate-gold-pulse" : ""}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                {isScanning ? "Stop Scanning" : "Start Scanning"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scanned Items ({scannedItems.length})</CardTitle>
            <CardDescription>Review and complete receiving</CardDescription>
          </CardHeader>
          <CardContent>
            {scannedItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No items scanned yet
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {scannedItems.map((item, idx) => (
                    <motion.div
                      key={`${item.variant_id}-${idx}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex justify-between items-center p-3 rounded-lg border border-gold/10 hover:bg-gold/5"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.size_ml}ml
                          {item.lot_number && ` • Lot: ${item.lot_number}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gold">Qty: {item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setScannedItems((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {scannedItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gold/20">
                <Button onClick={handleCompleteReceiving} className="w-full">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Receiving ({scannedItems.reduce((sum, item) => sum + item.quantity, 0)} items)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showLotModal} onOpenChange={setShowLotModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lot / Batch Information</DialogTitle>
            <DialogDescription>
              Enter lot number and expiry date for {currentItem?.product_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lotNumber">Lot Number (Optional)</Label>
              <Input
                id="lotNumber"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="Enter lot number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowLotModal(false)
              setLotNumber("")
              setExpiryDate("")
            }}>
              Skip
            </Button>
            <Button onClick={handleSaveLot}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

