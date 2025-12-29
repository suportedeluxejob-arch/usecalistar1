// Pagou Payment Gateway Integration
// API Documentation: https://docs.pagou.com.br

export interface PayerData {
  name: string
  document: string // CPF (11 digits) or CNPJ (14 digits)
}

export interface CreatePixPaymentRequest {
  amount: number
  description: string
  expiration: number // seconds (e.g., 3600 for 1 hour)
  payer: PayerData
  metadata?: { key: string; value: string }[]
  notification_url?: string
  customer_code?: string
}

export interface PixPaymentResponse {
  id: string
  amount: number
  description: string
  expiration: number
  payer: PayerData
  notification_url?: string
  customer_code?: string
  payload: {
    payload_id: number
    data: string // PIX copy-paste code
    image: string // QR Code base64 image
  }
  metadata?: { key: string; value: string }[]
}

export interface WebhookPayload {
  event_name: "qrcode.completed" | "qrcode.refunded"
  data: {
    id: string
    external_id?: string
    transaction_id: string
    e2e_id?: string
    amount: number
    payer?: {
      name: string
      document: string
      bank?: {
        code: string
        name: string
        agency: string
        account: string
        document: string
      }
    }
    description?: string
    client_code?: string
  }
}

const PAGOU_API_URL =
  process.env.NODE_ENV === "production" ? "https://api.pagou.com.br" : "https://sandbox.api.pagou.com.br"

export async function createPixPayment(data: CreatePixPaymentRequest): Promise<PixPaymentResponse> {
  const apiKey = process.env.PAGOU_SECRET_KEY

  if (!apiKey) {
    throw new Error("PAGOU_SECRET_KEY não configurada")
  }

  const response = await fetch(`${PAGOU_API_URL}/v1/pix`, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      "User-Agent": "usecalistar/1.0",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || `Erro ao criar pagamento PIX: ${response.status}`)
  }

  return response.json()
}

export async function getPixPaymentStatus(qrcodeId: string): Promise<PixPaymentResponse & { status: number }> {
  const apiKey = process.env.PAGOU_SECRET_KEY

  if (!apiKey) {
    throw new Error("PAGOU_SECRET_KEY não configurada")
  }

  const response = await fetch(`${PAGOU_API_URL}/v1/pix/${qrcodeId}`, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      "User-Agent": "usecalistar/1.0",
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || `Erro ao consultar pagamento: ${response.status}`)
  }

  return response.json()
}

// Validate CPF
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, "")

  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1+$/.test(cleanCPF)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(10))) return false

  return true
}

// Format CPF for display
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, "")
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}
