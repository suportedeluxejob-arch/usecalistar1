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

    if (!customer?.name || !customer?.document || !customer?.email) {
      return NextResponse.json({ error: "Nome, email e CPF são obrigatórios" }, { status: 400 })
    }

    // Clean and validate CPF
    const cleanDocument = customer.document.replace(/\D/g, "")
    if (!validateCPF(cleanDocument)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 })
    }

    // Create order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const roundedAmount = Math.round(amount * 100) / 100

    const pixPayment = await createPixPayment({
      amount: roundedAmount,
      payerQuestion: `Compra Calistar - ${items?.length || 1} item(s)`,
      external_id: orderId,
      payer: {
        name: customer.name,
        email: customer.email,
        document: cleanDocument,
      },
    })

    console.log("[v0] PIX payment created successfully:", pixPayment.id)

    return NextResponse.json({
      success: true,
      payment: {
        id: pixPayment.id,
        orderId,
        amount: pixPayment.amount,
        pixCode: pixPayment.pix_qr_code,
        qrCodeImage: pixPayment.pix_qr_code_base64.startsWith("data:")
          ? pixPayment.pix_qr_code_base64
          : `data:image/png;base64,${pixPayment.pix_qr_code_base64}`,
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
