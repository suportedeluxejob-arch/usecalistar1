import { type NextRequest, NextResponse } from "next/server"
import { createPixPayment, validateCPF } from "@/lib/pagou"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, items, customer } = body

    console.log("[v0] Checkout request received:", {
      amount,
      itemsCount: items?.length,
      customerName: customer?.name,
      hasSecretKey: !!process.env.PAGOU_SECRET_KEY,
      keyLength: process.env.PAGOU_SECRET_KEY?.length,
    })

    // Validate required fields
    if (!amount || amount < 5) {
      return NextResponse.json({ error: "Valor mínimo é R$ 5,00" }, { status: 400 })
    }

    if (!customer?.name || !customer?.document) {
      return NextResponse.json({ error: "Nome e CPF são obrigatórios" }, { status: 400 })
    }

    // Clean and validate CPF
    const cleanDocument = customer.document.replace(/\D/g, "")
    if (!validateCPF(cleanDocument)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 })
    }

    // Build description from items
    const description = items?.length > 0 ? `Compra usecalistar - ${items.length} item(s)` : "Compra usecalistar"

    // Create order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Get webhook URL from environment or build it
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/checkout/webhook`
      : undefined

    console.log("[v0] Webhook URL:", webhookUrl)

    const roundedAmount = Math.round(amount * 100) / 100

    // Create PIX payment via Pagou API
    const pixPayment = await createPixPayment({
      amount: roundedAmount,
      description,
      expiration: 3600, // 1 hour
      payer: {
        name: customer.name,
        document: cleanDocument,
      },
      metadata: [
        { key: "order_id", value: orderId },
        { key: "customer_email", value: customer.email || "" },
        { key: "customer_phone", value: customer.phone || "" },
      ],
      notification_url: webhookUrl,
      customer_code: customer.email || orderId,
    })

    console.log("[v0] PIX payment created successfully:", pixPayment.id)

    return NextResponse.json({
      success: true,
      payment: {
        id: pixPayment.id,
        orderId,
        amount: pixPayment.amount,
        pixCode: pixPayment.payload.data,
        qrCodeImage: pixPayment.payload.image,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Erro ao criar pagamento PIX:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao processar pagamento" },
      { status: 500 },
    )
  }
}
