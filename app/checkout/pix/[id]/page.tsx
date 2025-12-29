"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Copy, CheckCircle2, Clock, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"

interface PaymentData {
  id: string
  orderId: string
  amount: number
  pixCode: string
  qrCodeImage: string
  expiresAt: string
  items: { name: string; price: number; quantity: number }[]
  shipping: number
  total: number
}

export default function PixPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { clearCart } = useCart()
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<"pending" | "completed" | "expired">("pending")
  const [timeLeft, setTimeLeft] = useState(3600)
  const [checking, setChecking] = useState(false)

  // Load payment data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("pixPayment")
    if (stored) {
      const data = JSON.parse(stored) as PaymentData
      if (data.id === id) {
        setPayment(data)

        // Calculate remaining time
        const expiresAt = new Date(data.expiresAt).getTime()
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setTimeLeft(remaining)
      }
    }
  }, [id])

  // Countdown timer
  useEffect(() => {
    if (status !== "pending" || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status, timeLeft])

  // Poll for payment status
  useEffect(() => {
    if (status !== "pending") return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/checkout/status/${id}`)
        const data = await response.json()

        if (data.paid) {
          setStatus("completed")
          clearCart()
          sessionStorage.removeItem("pixPayment")
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error)
      }
    }

    // Check immediately and then every 5 seconds
    checkStatus()
    const interval = setInterval(checkStatus, 5000)

    return () => clearInterval(interval)
  }, [id, status, clearCart])

  const handleCopy = async () => {
    if (!payment?.pixCode) return

    try {
      await navigator.clipboard.writeText(payment.pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  const handleManualCheck = async () => {
    setChecking(true)
    try {
      const response = await fetch(`/api/checkout/status/${id}`)
      const data = await response.json()

      if (data.paid) {
        setStatus("completed")
        clearCart()
        sessionStorage.removeItem("pixPayment")
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error)
    } finally {
      setChecking(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Pagamento Confirmado!</h1>
          <p className="text-muted-foreground">Seu pedido #{payment.orderId} foi confirmado com sucesso.</p>
          <div className="bg-card rounded-2xl p-6 border border-border text-left">
            <h3 className="font-semibold text-foreground mb-4">Resumo do Pedido</h3>
            {payment.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground">
                  {item.name} x{item.quantity}
                </span>
                <span className="text-foreground">
                  R$ {(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-4 mt-2 border-t border-border">
              <span>Total Pago</span>
              <span>R$ {payment.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <Button asChild className="rounded-full" size="lg">
            <Link href="/">Voltar para a Loja</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <Clock className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">PIX Expirado</h1>
          <p className="text-muted-foreground">O tempo para pagamento expirou. Por favor, tente novamente.</p>
          <div className="flex flex-col gap-3">
            <Button asChild className="rounded-full" size="lg">
              <Link href="/checkout">Tentar Novamente</Link>
            </Button>
            <Button variant="outline" asChild className="rounded-full bg-transparent" size="lg">
              <Link href="/">Voltar para a Loja</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/checkout"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-foreground">Pagamento PIX</h1>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Timer */}
          <div className="bg-primary/10 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Tempo restante: {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-card rounded-2xl p-8 border border-border text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Escaneie o QR Code</h2>
              <p className="text-muted-foreground">Use o app do seu banco para escanear</p>
            </div>

            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img src={payment.qrCodeImage || "/placeholder.svg"} alt="QR Code PIX" className="w-48 h-48" />
              </div>
            </div>

            <div className="text-3xl font-bold text-foreground">
              R$ {payment.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Copy Code */}
          <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Ou copie o código PIX</h3>
              <p className="text-sm text-muted-foreground">Cole o código no app do seu banco</p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 break-all text-sm text-muted-foreground font-mono">
              {payment.pixCode}
            </div>

            <Button
              onClick={handleCopy}
              variant={copied ? "secondary" : "default"}
              className="w-full rounded-full"
              size="lg"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Código Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código PIX
                </>
              )}
            </Button>
          </div>

          {/* Manual Check */}
          <div className="text-center">
            <Button variant="ghost" onClick={handleManualCheck} disabled={checking} className="text-muted-foreground">
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Já paguei, verificar pagamento
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-secondary/30 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Como pagar:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Abra o app do seu banco</li>
              <li>Escolha a opção PIX</li>
              <li>Escaneie o QR Code ou cole o código</li>
              <li>Confirme o pagamento</li>
              <li>Aguarde a confirmação (automática)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
