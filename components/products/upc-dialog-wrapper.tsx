"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"
import { EditUPCDialog } from "./edit-upc-dialog"

interface Variant {
  id: string
  size_ml: number
  sku: string
  upc: string | null
  price: number
  cost: number
  allocation_only: boolean
  collectible: boolean
}

interface UPCDialogWrapperProps {
  variant: Variant
  productName: string
  onUpdate: () => void
}

export function UPCDialogWrapper({ variant, productName, onUpdate }: UPCDialogWrapperProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="font-sans"
      >
        <QrCode className="h-4 w-4 mr-2" />
        {variant.upc ? "Edit UPC" : "Add UPC"}
      </Button>
      <EditUPCDialog
        variantId={variant.id}
        currentUPC={variant.upc}
        productName={productName}
        sizeMl={variant.size_ml}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  )
}

