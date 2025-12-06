"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { CreditCard, Calculator } from "lucide-react"

interface CashPaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  total: number
  onConfirm: (receivedAmount: number, change: number) => void
}

export function CashPaymentDialog({
  isOpen,
  onClose,
  total,
  onConfirm,
}: CashPaymentDialogProps) {
  const [receivedAmount, setReceivedAmount] = useState("")
  const [change, setChange] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setReceivedAmount("")
      setChange(0)
    }
  }, [isOpen])

  useEffect(() => {
    const received = parseFloat(receivedAmount) || 0
    const calculatedChange = received >= total ? received - total : 0
    setChange(calculatedChange)
  }, [receivedAmount, total])

  const handleConfirm = () => {
    const received = parseFloat(receivedAmount) || 0
    if (received < total) {
      return
    }
    onConfirm(received, change)
    setReceivedAmount("")
    setChange(0)
  }

  const handleQuickAmount = (multiplier: number) => {
    const quickAmount = Math.ceil(total * multiplier)
    setReceivedAmount(quickAmount.toString())
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-gold" />
            Cash Payment
          </DialogTitle>
          <DialogDescription>
            Enter the amount received from the customer
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="total">Total Amount</Label>
            <div className="text-2xl font-bold text-gold">
              {formatCurrency(total)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="received">Amount Received</Label>
            <Input
              id="received"
              type="number"
              placeholder="0.00"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && parseFloat(receivedAmount) >= total) {
                  handleConfirm()
                }
              }}
              className="text-lg font-semibold"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(1)}
                className="text-xs"
              >
                Exact
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(1.1)}
                className="text-xs"
              >
                +10%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(1.2)}
                className="text-xs"
              >
                +20%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReceivedAmount(Math.ceil(total).toString())}
                className="text-xs"
              >
                Round Up
              </Button>
            </div>
          </div>

          {change > 0 && (
            <div className="space-y-2 p-4 rounded-lg bg-gold/10 border border-gold/20">
              <Label className="text-sm text-muted-foreground">Change to Give</Label>
              <div className="text-3xl font-bold text-gold">
                {formatCurrency(change)}
              </div>
            </div>
          )}

          {receivedAmount && parseFloat(receivedAmount) < total && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              Insufficient amount. Need {formatCurrency(total - parseFloat(receivedAmount) || 0)} more.
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!receivedAmount || parseFloat(receivedAmount) < total}
              className="flex-1 bg-gold text-black hover:bg-gold/90"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Complete Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

