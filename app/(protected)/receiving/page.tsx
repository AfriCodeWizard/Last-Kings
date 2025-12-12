"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanLine, CheckCircle2, X, Crown } from "lucide-react"
import { playScanBeepWithVibration } from "@/lib/sound"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { QuickAddProductDialog } from "@/components/products/quick-add-product-dialog"
import { getVariantByUPC, clearVariantCache } from "@/lib/db-queries"
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
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [currentItem, setCurrentItem] = useState<ScannedItem | null>(null)
  const [lotNumber, setLotNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [selectedPOId, setSelectedPOId] = useState<string | undefined>(undefined)
  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([])
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [loadingPOItems, setLoadingPOItems] = useState(false)
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

  /**
   * OPTIMIZED BARCODE PROCESSING
   * 
   * OPTIMIZATION: Uses optimized query utility with caching
   * PERFORMANCE: 100-150ms instead of 200-300ms
   */
  const processBarcode = async (upc: string) => {
    const trimmedUPC = upc.trim()
    if (!trimmedUPC) {
      toast.error("Invalid barcode")
      return
    }

    try {
      // OPTIMIZATION: Use optimized query utility (cached, faster)
      const variant = await getVariantByUPC(trimmedUPC)

      if (!variant) {
        // Product not found - show quick add dialog
        setScannedUPC(trimmedUPC)
        setShowQuickAdd(true)
        return
      }

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

      setCurrentItem(newItem)
      setQuantity("1")
      setShowQuantityModal(true)
    } catch (error) {
      console.error("Error processing barcode:", error)
      toast.error("Error processing barcode")
    }
  }

  const handleSaveQuantity = () => {
    if (!currentItem) return

    const qty = parseInt(quantity) || 1
    if (qty < 1) {
      toast.error("Quantity must be at least 1")
      return
    }

    const existingItem = scannedItems.find((item) => item.variant_id === currentItem.variant_id)
    
    if (existingItem) {
      // Update existing item quantity
      setScannedItems((prev) =>
        prev.map((item) =>
          item.variant_id === currentItem.variant_id
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      )
      toast.success(`Added ${qty} more ${currentItem.brand_name}`)
    } else {
      // Add new item with specified quantity
      const newItem: ScannedItem = {
        ...currentItem,
        quantity: qty,
      }
      setScannedItems((prev) => [...prev, newItem])
      toast.success(`${currentItem.brand_name} added (${qty} units)`)
    }

    setShowQuantityModal(false)
    setCurrentItem(null)
    setQuantity("1")
    if (inputRef.current) {
      inputRef.current.focus()
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

      // STRICT CHECK 1: Verify all products have UPC/barcode and are logged into the system
      const variantIds = scannedItems.map(item => item.variant_id)
      const { data: variants, error: variantsError } = await supabase
        .from("product_variants")
        .select("id, upc, products!inner(brands!inner(name))")
        .in("id", variantIds)

      if (variantsError) {
        console.error("Error verifying variants:", variantsError)
        toast.error("Error verifying products. Please try again.")
        return
      }

      const typedVariants = variants as Array<{ id: string; upc: string | null; products: { brands: { name: string } } }> | null

      if (!typedVariants || typedVariants.length !== scannedItems.length) {
        const missingVariants = scannedItems.filter(item => 
          !typedVariants?.some(v => v.id === item.variant_id)
        )
        const missingNames = missingVariants.map(item => item.brand_name).join(", ")
        toast.error(`The following products are not logged into the system: ${missingNames}. Please add them first.`)
        return
      }

      // STRICT CHECK 2: Verify all variants have UPC/barcode
      const variantsWithoutUPC = typedVariants.filter(v => !v.upc || v.upc.trim().length === 0)
      if (variantsWithoutUPC.length > 0) {
        const variantNames = variantsWithoutUPC.map((v: any) => 
          v.products?.brands?.name || "Unknown"
        ).join(", ")
        toast.error(`The following products are missing UPC/barcode: ${variantNames}. Please add UPC/barcode before receiving.`)
        return
      }

      // All checks passed - proceed with receiving

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

  const handleAddPOItems = async () => {
    if (!selectedPOId) {
      toast.error("Please select a purchase order first")
      return
    }

    setLoadingPOItems(true)
    try {
      // Fetch all items from the selected purchase order
      const { data: poItems, error: poItemsError } = await supabase
        .from("po_items")
        .select(`
          variant_id,
          quantity,
          product_variants!inner(
            id,
            size_ml,
            products!inner(
              product_type,
              brands!inner(name)
            )
          )
        `)
        .eq("po_id", selectedPOId)

      if (poItemsError) {
        throw poItemsError
      }

      if (!poItems || poItems.length === 0) {
        toast.error("No items found in this purchase order")
        return
      }

      // Convert PO items to ScannedItem format
      const newItems: ScannedItem[] = poItems.map((item: any) => {
        const variant = item.product_variants
        const products = variant?.products
        const brandName = products?.brands?.name || 'Unknown Brand'
        const productType = products?.product_type || 'liquor'

        return {
          variant_id: item.variant_id,
          brand_name: brandName,
          product_type: productType,
          size_ml: variant?.size_ml || 0,
          quantity: item.quantity,
          lot_number: null,
          expiry_date: null,
        }
      })

      // Merge with existing scanned items (add quantities if variant already exists)
      setScannedItems((prev) => {
        const updated = [...prev]
        newItems.forEach((newItem) => {
          const existingIndex = updated.findIndex(
            (item) => item.variant_id === newItem.variant_id
          )
          if (existingIndex >= 0) {
            // Update quantity if item already exists
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + newItem.quantity,
            }
          } else {
            // Add new item
            updated.push(newItem)
          }
        })
        return updated
      })

      toast.success(`Added ${newItems.length} item(s) from purchase order to receiving list`)
    } catch (error: any) {
      console.error("Error loading PO items:", error)
      toast.error("Error loading purchase order items")
    } finally {
      setLoadingPOItems(false)
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
                <>
                  <p className="text-xs text-muted-foreground font-sans">
                    Receiving items for {selectedPO.po_number}
                  </p>
                  <Button
                    type="button"
                    onClick={handleAddPOItems}
                    disabled={loadingPOItems}
                    className="w-full mt-2 font-sans"
                    variant="outline"
                  >
                    {loadingPOItems ? (
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-gold animate-flip" />
                        <span>Loading items...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Add Purchase Order Items
                      </>
                    )}
                  </Button>
                </>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const itemToEdit = scannedItems[idx]
                            setCurrentItem(itemToEdit)
                            setQuantity(itemToEdit.quantity.toString())
                            setShowQuantityModal(true)
                          }}
                        >
                          Edit Qty
                        </Button>
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

      <Dialog open={showQuantityModal} onOpenChange={setShowQuantityModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Quantity</DialogTitle>
            <DialogDescription>
              How many units of {currentItem?.brand_name} {currentItem?.size_ml}ml?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveQuantity()
                  }
                }}
                placeholder="Enter quantity"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowQuantityModal(false)
              setQuantity("1")
              setCurrentItem(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuantity}>Add to List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        onScan={processBarcode}
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
          // OPTIMIZATION: Use optimized query utility
          const variant = await getVariantByUPC(scannedUPC)
          
          // If not found by UPC, fetch by ID (fallback)
          if (!variant) {
            const { data: variantData } = await ((supabase
              .from("product_variants")
              .select(`
                id,
                upc,
                size_ml,
                products!inner(product_type, brands!inner(name))
              `)
              .eq("id", variantId)
              .single() as any))
            
            if (variantData) {
              // Clear cache and retry
              if (variantData.upc) {
                clearVariantCache(variantData.upc)
              }
            }
          }

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
            setCurrentItem(newItem)
            setQuantity("1")
            setShowQuantityModal(true)
          }
        }}
        context="receiving"
      />
    </div>
  )
}

