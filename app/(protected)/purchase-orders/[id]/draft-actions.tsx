"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mail, MessageCircle, Edit } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DraftActionsProps {
  poId: string
  distributorEmail?: string | null
  distributorPhone?: string | null
  status: string
}

export function DraftActions({ poId, distributorEmail, distributorPhone, status }: DraftActionsProps) {
  const router = useRouter()
  const [sending, setSending] = useState(false)

  // Only show actions for draft status
  if (status !== 'draft') {
    return null
  }

  const handleSendEmail = async () => {
    if (!distributorEmail) {
      toast.error("Distributor email not found")
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/purchase-orders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId,
          distributorEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success("Purchase order sent via email!")
      router.refresh()
    } catch (error: any) {
      console.error("Error sending email:", error)
      toast.error(`Error sending email: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (!distributorPhone) {
      toast.error("Distributor phone number not found")
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/purchase-orders/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId,
          distributorPhone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send WhatsApp message')
      }

      // Open WhatsApp in a new window/tab
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank')
        toast.success("Opening WhatsApp... Purchase order ready to send!")
      } else {
        toast.success("Purchase order created! WhatsApp URL generated.")
      }
      
      router.refresh()
    } catch (error: any) {
      console.error("Error sending WhatsApp:", error)
      toast.error(`Error sending WhatsApp: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        variant="outline"
        onClick={() => router.push(`/purchase-orders/${poId}/edit`)}
        className="font-sans"
      >
        <Edit className="h-4 w-4 mr-2" />
        Edit Draft
      </Button>
      {distributorEmail && (
        <Button
          variant="default"
          onClick={handleSendEmail}
          disabled={sending}
          className="font-sans"
        >
          <Mail className="h-4 w-4 mr-2" />
          {sending ? 'Sending...' : 'Send Email'}
        </Button>
      )}
      {distributorPhone && (
        <Button
          variant="default"
          onClick={handleSendWhatsApp}
          disabled={sending}
          className="font-sans"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {sending ? 'Sending...' : 'Send WhatsApp'}
        </Button>
      )}
    </div>
  )
}

