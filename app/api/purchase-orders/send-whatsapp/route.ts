import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { poId, distributorPhone } = await request.json()

    if (!poId || !distributorPhone) {
      return NextResponse.json(
        { error: "PO ID and distributor phone are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch purchase order details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        distributors(name, contact_name),
        po_items(
          quantity,
          unit_cost,
          product_variants(
            size_ml,
            sku,
            products!inner(
              name,
              brands!inner(name)
            )
          )
        )
      `)
      .eq("id", poId)
      .single()

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      )
    }

    // Format phone number (remove any non-digit characters except +)
    const formattedPhone = distributorPhone.replace(/[^\d+]/g, '')
    
    // Generate WhatsApp message
    const message = `*Purchase Order ${po.po_number} - Last Kings*

Date: ${new Date(po.created_at).toLocaleDateString('en-KE', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

Total Amount: KES ${po.total_amount.toLocaleString('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}

*Items:*
${po.po_items.map((item: any, index: number) => {
  const variant = item.product_variants
  const product = variant.products
  const brand = product.brands
  return `${index + 1}. ${brand.name} ${product.name} (${variant.size_ml}ml)
   SKU: ${variant.sku}
   Qty: ${item.quantity} × KES ${item.unit_cost.toLocaleString('en-KE', {
     minimumFractionDigits: 2,
     maximumFractionDigits: 2
   })} = KES ${(item.quantity * item.unit_cost).toLocaleString('en-KE', {
     minimumFractionDigits: 2,
     maximumFractionDigits: 2
   })}`
}).join('\n\n')}

Please confirm receipt and expected delivery date.

Thank you,
Last Kings POS System`

    // Generate WhatsApp URL
    // WhatsApp Web/App URL format: https://wa.me/PHONENUMBER?text=MESSAGE
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

    // Update PO status to 'sent' if not already
    if (po.status !== 'sent') {
      await (supabase
        .from("purchase_orders") as any)
        .update({ status: 'sent' })
        .eq("id", poId)
    }

    // In a real implementation, you might use:
    // - WhatsApp Business API
    // - Twilio WhatsApp API
    // - MessageBird
    // For now, we return the URL that can be opened in a new window

    return NextResponse.json({
      success: true,
      message: "Purchase order WhatsApp message prepared",
      whatsappUrl,
      phone: formattedPhone,
      messageText: message
    })
  } catch (error: any) {
    console.error("Error sending WhatsApp:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send WhatsApp message" },
      { status: 500 }
    )
  }
}

