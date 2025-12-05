import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { poId, distributorEmail } = await request.json()

    if (!poId || !distributorEmail) {
      return NextResponse.json(
        { error: "PO ID and distributor email are required" },
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

    // Generate email content
    const emailSubject = `Purchase Order ${po.po_number} - Last Kings`
    
    let emailBody = `
Dear ${po.distributors.contact_name || po.distributors.name},

Please find below our purchase order details:

Purchase Order Number: ${po.po_number}
Date: ${new Date(po.created_at).toLocaleDateString('en-KE', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
Total Amount: KES ${po.total_amount.toLocaleString('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}

ITEMS:
${po.po_items.map((item: any, index: number) => {
  const variant = item.product_variants
  const product = variant.products
  const brand = product.brands
  return `${index + 1}. ${brand.name} (${variant.size_ml}ml)
     SKU: ${variant.sku}
     Quantity: ${item.quantity}
     Unit Cost: KES ${item.unit_cost.toLocaleString('en-KE', {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
     })}
     Subtotal: KES ${(item.quantity * item.unit_cost).toLocaleString('en-KE', {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
     })}
`
}).join('\n')}

Please confirm receipt and expected delivery date.

Thank you,
Last Kings POS System
`

    // In a real implementation, you would use an email service like:
    // - Resend (resend.com)
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    // For now, we'll just log the email and update the status
    console.log("Email to send:", {
      to: distributorEmail,
      subject: emailSubject,
      body: emailBody
    })

    // Update PO status to 'sent' if not already
    if (po.status !== 'sent') {
      await (supabase
        .from("purchase_orders") as any)
        .update({ status: 'sent' })
        .eq("id", poId)
    }

    // TODO: Integrate with actual email service
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'orders@lastkings.com',
    //   to: distributorEmail,
    //   subject: emailSubject,
    //   html: emailBody.replace(/\n/g, '<br>')
    // })

    return NextResponse.json({
      success: true,
      message: "Purchase order email prepared",
      emailContent: {
        to: distributorEmail,
        subject: emailSubject,
        body: emailBody
      }
    })
  } catch (error: any) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    )
  }
}

