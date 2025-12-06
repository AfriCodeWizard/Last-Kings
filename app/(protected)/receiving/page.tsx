"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanLine, CheckCircle2, X } from "lucide-react"
import { playScanBeepWithVibration } from "@/lib/sound"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { QuickAddProductDialog } from "@/components/products/quick-add-product-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"

interface ScannedItem {
  variant_id: string
  brand_name: string
  product_type: string
  size_ml: number
  quantity: number
  lot_number: string | null
  expiry_date: string | null
}

interface PurchaseOrder {
  id: string
  po_number: string
  distributor_id: string
  total_amount: number
  distributors: {
    name: string
  }
}

export default function ReceivingPage() {
  const [barcode, setBarcode] = useState("")
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [scannedUPC, setScannedUPC] = useState("")
  const [showLotModal, setShowLotModal] = useState(false)
  const [currentItem, setCurrentItem] = useState<ScannedItem | null>(null)
  const [lotNumber, setLotNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [selectedPOId, setSelectedPOId] = useState<string | undefined>(undefined)
  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([])
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
    loadPendingPOs()
  }, [])

  useEffect(() => {
    if (selectedPOId) {
      const po = pendingPOs.find(p => p.id === selectedPOId)
      setSelectedPO(po || null)
    } else {
      setSelectedPO(null)
    }
  }, [selectedPOId, pendingPOs])

  const loadPendingPOs = async () => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        distributors(name)
      `)
      .eq("status", "sent")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error loading pending POs:", error)
      return
    }

    if (data) {
      setPendingPOs(data as any)
    }
  }

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
    console.log("processBarcode called with UPC:", upc)
    if (!upc || upc.trim().length === 0) {
      console.error("Empty UPC provided")
      toast.error("Invalid barcode")
      return
    }
    try {
      console.log("Querying database for UPC:", upc.trim())
      // Query without .single() to avoid error when no results
      const { data: variants, error } = await ((supabase
        .from("product_variants")
        .select(`
          id,
          upc,
          size_ml,
          products!inner(product_type, brands!inner(name))
        `)
        .eq("upc", upc.trim()) as any))

      console.log("Database query result:", { variants, error, count: variants?.length })

      if (error) {
        console.error("Database error:", error)
        toast.error(`Database error: ${error.message}`)
        return
      }

      if (!variants || variants.length === 0) {
        console.error("No variant found for UPC:", upc)
        // Show quick add dialog instead of just error
        setScannedUPC(upc)
        setShowQuickAdd(true)
        return
      }

      const variant = variants[0]
      console.log("Variant found:", variant)

      console.log("Variant found:", variant)
      playScanBeepWithVibration()

      const variantTyped = variant as any
      console.log("Variant typed:", variantTyped)
      const existingItem = scannedItems.find((item) => item.variant_id === variantTyped.id)
      console.log("Existing item:", existingItem)

      if (existingItem) {
        console.log("Updating existing item quantity")
        const productName = variantTyped.products.brands?.name || 'Product'
        const productSize = variantTyped.size_ml === 1000 ? '1L' : `${variantTyped.size_ml}ml`
        
        setScannedItems((prev) =>
          prev.map((item) =>
            item.variant_id === variantTyped.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
        toast.warning(`${productName} ${productSize} is already in this receiving session. Quantity increased.`, {
          description: "This item was previously scanned in the current session.",
          duration: 4000,
        })
      } else {
        console.log("Adding new item to scanned items")
        const newItem: ScannedItem = {
          variant_id: variantTyped.id,
          brand_name: variantTyped.products.brands?.name || '',
          product_type: variantTyped.products.product_type || 'liquor',
          size_ml: variantTyped.size_ml,
          quantity: 1,
          lot_number: null,
          expiry_date: null,
        }
        console.log("New item:", newItem)
        setScannedItems((prev) => {
          const updated = [...prev, newItem]
          console.log("Updated scanned items:", updated)
          return updated
        })
        setCurrentItem(newItem)
        setShowLotModal(true)
        toast.success(`${variantTyped.products.brands?.name || 'Product'} added`)
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

      // Create receiving session with optional PO link
      const { data: session, error: createSessionError } = await ((supabase.from("receiving_sessions") as any)
        .insert({
          received_by: user.id,
          po_id: selectedPOId || null,
          status: "in_progress",
        })
        .select()
        .single())

      if (createSessionError) throw createSessionError

      // Get warehouse location (create if it doesn't exist)
      let { data: location, error: locationError } = await supabase
        .from("inventory_locations")
        .select("id")
        .eq("type", "warehouse")
        .limit(1)
        .maybeSingle()

      if (locationError && locationError.code !== 'PGRST116') {
        console.error("Error fetching warehouse location:", locationError)
        toast.error("Error finding warehouse location")
        return
      }

      // If no warehouse exists, create one
      if (!location) {
        console.log("No warehouse location found, creating one...")
        const { data: newLocation, error: createLocationError } = await ((supabase
          .from("inventory_locations") as any)
          .insert({
            name: "Warehouse",
            type: "warehouse"
          })
          .select("id")
          .single())

        if (createLocationError || !newLocation) {
          console.error("Error creating warehouse location:", createLocationError)
          toast.error("Error creating warehouse location")
          return
        }
        location = newLocation
        toast.success("Warehouse location created")
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

      if (itemsError) {
        console.error("Error inserting received items:", itemsError)
        throw itemsError
      }

      // Verify stock was created/updated by checking stock_levels
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Verify stock was created for each item
      let stockIssues = 0
      for (const item of receivedItems) {
        // Check for stock with matching variant and location
        // Handle NULL lot_number case
        let stockQuery: any = supabase
          .from("stock_levels")
          .select("quantity, lot_number")
          .eq("variant_id", item.variant_id)
          .eq("location_id", item.location_id)

        // If lot_number is provided, match it; otherwise match NULL
        if (item.lot_number) {
          stockQuery = stockQuery.eq("lot_number", item.lot_number)
        } else {
          stockQuery = stockQuery.is("lot_number", null)
        }

        const { data: stockCheck, error: stockError } = await stockQuery.limit(1).maybeSingle() as { data: { quantity: number; lot_number: string | null } | null; error: any }

        if (stockError) {
          console.error(`Error verifying stock for variant ${item.variant_id}:`, stockError)
          stockIssues++
        } else if (!stockCheck || stockCheck.quantity < item.quantity) {
          console.warn(`Stock issue for variant ${item.variant_id} - Expected: ${item.quantity}, Found: ${stockCheck?.quantity || 0}`)
          // Manually create/update stock entry if trigger failed
          const stockData: any = {
            variant_id: item.variant_id,
            location_id: item.location_id,
            quantity: item.quantity,
          }
          if (item.lot_number) stockData.lot_number = item.lot_number
          if (item.expiry_date) stockData.expiry_date = item.expiry_date

          const { error: manualStockError } = await ((supabase
            .from("stock_levels") as any)
            .upsert(stockData, {
              onConflict: 'variant_id,location_id,lot_number',
            }))
          
          if (manualStockError) {
            console.error("Error manually creating stock:", manualStockError)
            stockIssues++
          } else {
            console.log(`Manually created/updated stock for variant ${item.variant_id}`)
          }
        }
      }

      if (stockIssues > 0) {
        console.warn(`${stockIssues} stock verification issue(s) detected and attempted to fix`)
      }

      // Complete session
      const { error: completeSessionError } = await ((supabase.from("receiving_sessions") as any)
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", session.id))

      if (completeSessionError) {
        console.error("Error completing session:", completeSessionError)
        throw completeSessionError
      }

      // If PO is linked, check if it's fully received and update status
      if (selectedPOId) {
        await checkAndUpdatePOStatus(selectedPOId)
      }

      toast.success(`Receiving session completed! ${receivedItems.length} item(s) added to warehouse inventory.`)
      setScannedItems([])
      setSelectedPOId(undefined)
      setSelectedPO(null)
      await loadPendingPOs() // Refresh pending POs list
    } catch (error) {
      console.error("Error completing receiving session:", error)
      toast.error(error instanceof Error ? error.message : "Error completing receiving session")
    }
  }

  const checkAndUpdatePOStatus = async (poId: string) => {
    try {
      // Get all PO items with their expected quantities
      const { data: poItems, error: poItemsError } = await ((supabase
        .from("po_items") as any)
        .select("id, variant_id, quantity")
        .eq("po_id", poId))

      if (poItemsError) throw poItemsError
      if (!poItems || poItems.length === 0) return

      // Get all received items for this PO (from all receiving sessions linked to this PO)
      const { data: receivingSessions, error: sessionsError } = await ((supabase
        .from("receiving_sessions") as any)
        .select("id")
        .eq("po_id", poId)
        .eq("status", "completed"))

      if (sessionsError) throw sessionsError
      if (!receivingSessions || receivingSessions.length === 0) return

      const sessionIds = (receivingSessions as any[]).map((s: any) => s.id)

      // Get all received items for these sessions
      const { data: receivedItems, error: receivedError } = await ((supabase
        .from("received_items") as any)
        .select("variant_id, quantity")
        .in("session_id", sessionIds))

      if (receivedError) throw receivedError

      // Calculate received quantities per variant
      const receivedByVariant: Record<string, number> = {}
      if (receivedItems) {
        receivedItems.forEach((item: any) => {
          receivedByVariant[item.variant_id] = (receivedByVariant[item.variant_id] || 0) + item.quantity
        })
      }

      // Check if all PO items are fully received
      const allFullyReceived = poItems.every((poItem: any) => {
        const receivedQty = receivedByVariant[poItem.variant_id] || 0
        return receivedQty >= poItem.quantity
      })

      // If all items are fully received, update PO status to 'received'
      if (allFullyReceived) {
        // Get PO number before updating
        const { data: poData } = await ((supabase
          .from("purchase_orders") as any)
          .select("po_number")
          .eq("id", poId)
          .single())

        const { error: updateError } = await ((supabase
          .from("purchase_orders") as any)
          .update({ status: "received" })
          .eq("id", poId))

        if (updateError) throw updateError
        toast.success(`Purchase order ${(poData as any)?.po_number || 'PO'} marked as fully received!`)
      }
    } catch (error) {
      console.error("Error checking PO status:", error)
      // Don't show error to user as receiving was successful
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Receiving</h1>
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
              <Label htmlFor="purchaseOrder">Purchase Order (Optional)</Label>
              <div className="flex gap-2">
                <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                  <SelectTrigger className="font-sans flex-1">
                    <SelectValue placeholder="Select purchase order to link..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingPOs.map((po) => (
                      <SelectItem key={po.id} value={po.id} className="font-sans">
                        {po.po_number} - {po.distributors?.name} ({formatCurrency(po.total_amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPOId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedPOId(undefined)}
                    className="font-sans"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {selectedPO && (
                <p className="text-xs text-muted-foreground font-sans">
                  Receiving items for {selectedPO.po_number}
                </p>
              )}
            </div>
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
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-gold text-black hover:bg-gold/90 font-sans"
              >
                <ScanLine className="h-5 w-5 mr-2" />
                Start Scanning
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
                        <div className="font-medium">
                          {item.brand_name}
                        </div>
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
              Enter lot number and expiry date for {currentItem?.brand_name || 'this item'}
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

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={async (barcode) => {
          await processBarcode(barcode)
          setBarcode("")
        }}
        title="Scan Barcode"
        description="Position the barcode on the liquor bottle within the frame"
      />

      <QuickAddProductDialog
        scannedUPC={scannedUPC}
        isOpen={showQuickAdd}
        onClose={() => {
          setShowQuickAdd(false)
          setScannedUPC("")
        }}
        onProductCreated={async (variantId) => {
          // After product is created, add it to receiving list
          const { data: variant } = await ((supabase
            .from("product_variants")
            .select(`
              id,
              upc,
              size_ml,
              products!inner(product_type, brands!inner(name))
            `)
            .eq("id", variantId)
            .single() as any))

          if (variant) {
            playScanBeepWithVibration()
            const newItem: ScannedItem = {
              variant_id: variant.id,
              brand_name: variant.products.brands?.name || '',
              product_type: variant.products.product_type || 'liquor',
              size_ml: variant.size_ml,
              quantity: 1,
              lot_number: null,
              expiry_date: null,
            }
            setScannedItems((prev) => [...prev, newItem])
            setCurrentItem(newItem)
            setShowLotModal(true)
            toast.success(`${variant.products.brands?.name || 'Product'} added`)
          }
        }}
        context="receiving"
      />
    </div>
  )
}

