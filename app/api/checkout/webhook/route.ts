import { type NextRequest, NextResponse } from "next/server"
import type { WebhookPayload } from "@/lib/pagou"

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()

    console.log("Webhook recebido:", payload.event_name, payload.data.id)

    if (payload.event_name === "qrcode.completed") {
      // Payment confirmed!
      console.log("Pagamento confirmado:", {
        id: payload.data.id,
        transactionId: payload.data.transaction_id,
        amount: payload.data.amount,
        payer: payload.data.payer?.name,
      })

      // Here you would typically:
      // 1. Update order status in your database
      // 2. Send confirmation email to customer
      // 3. Trigger fulfillment process
      // 4. Update inventory
    }

    if (payload.event_name === "qrcode.refunded") {
      // Payment refunded
      console.log("Pagamento estornado:", {
        id: payload.data.id,
        transactionId: payload.data.transaction_id,
        amount: payload.data.amount,
      })

      // Handle refund logic here
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("Erro no webhook:", error)
    // Still return 200 to prevent retries for malformed requests
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
