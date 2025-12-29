"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShoppingBag, User, CreditCard, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/contexts/cart-context"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  })

  const freeShippingThreshold = 299
  const hasFreeShipping = totalPrice >= freeShippingThreshold
  const shippingCost = hasFreeShipping ? 0 : 19.9
  const finalTotal = totalPrice + shippingCost

  const handleCPFChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11)
    let formatted = cleaned
    if (cleaned.length > 9) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`
    } else if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`
    } else if (cleaned.length > 3) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`
    }
    setFormData({ ...formData, cpf: formatted })
  }

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11)
    let formatted = cleaned
    if (cleaned.length > 6) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    } else if (cleaned.length > 2) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    }
    setFormData({ ...formData, phone: formatted })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/checkout/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalTotal,
          items: items.map((item) => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          customer: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone.replace(/\D/g, ""),
            document: formData.cpf.replace(/\D/g, ""),
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar pagamento")
      }

      // Store payment data in sessionStorage for the PIX page
      sessionStorage.setItem(
        "pixPayment",
        JSON.stringify({
          ...data.payment,
          items: items.map((item) => ({
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
          })),
          shipping: shippingCost,
          total: finalTotal,
        }),
      )

      // Navigate to PIX payment page
      router.push(`/checkout/pix/${data.payment.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento")
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Seu carrinho está vazio</h1>
          <p className="text-muted-foreground">Adicione produtos para continuar</p>
          <Button asChild className="rounded-full">
            <Link href="/">Voltar para a Loja</Link>
          </Button>
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
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-foreground">Checkout</h1>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Seus Dados</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <div className="flex items-center gap-3 mb-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Pagamento via PIX</p>
                      <p className="text-sm text-muted-foreground">Pagamento instantâneo e seguro</p>
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : (
                      <>Pagar R$ {finalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">Resumo do Pedido</h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-4">
                    <div className="w-16 h-20 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                      <img
                        src={item.product.image || "/placeholder.svg"}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">{item.product.name}</h4>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                        {item.size && <span>Tam: {item.size}</span>}
                        {item.color && <span>Cor: {item.color}</span>}
                        <span>Qtd: {item.quantity}</span>
                      </div>
                      <div className="font-semibold text-foreground mt-1">
                        R$ {(item.product.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">
                    R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span className={hasFreeShipping ? "text-primary font-medium" : "text-foreground"}>
                    {hasFreeShipping
                      ? "Grátis"
                      : `R$ ${shippingCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">
                    R$ {finalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-2xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Ambiente seguro. Seus dados estão protegidos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
