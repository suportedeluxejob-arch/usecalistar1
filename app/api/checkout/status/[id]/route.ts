import { type NextRequest, NextResponse } from "next/server"
import { getPixPaymentStatus } from "@/lib/pagou"

// Status mapping from Pagou API
const STATUS_MAP: Record<number, string> = {
  1: "empty",
  2: "active",
  3: "canceled",
  4: "completed",
  5: "refunded",
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID do pagamento não fornecido" }, { status: 400 })
    }

    const payment = await getPixPaymentStatus(id)
    const statusName = STATUS_MAP[payment.status] || "unknown"

    return NextResponse.json({
      id: payment.id,
      status: statusName,
      statusCode: payment.status,
      amount: payment.amount,
      paid: payment.status === 4, // StatusCompleted
    })
  } catch (error) {
    console.error("Erro ao consultar status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar pagamento" },
      { status: 500 },
    )
  }
}
