"use client"

import { useRouter } from "next/navigation"
import { Trash2, ShoppingCart, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { useApp } from "@/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatPrice } from "@/lib/format"

export default function CartPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { cart, cartTotal, removeFromCart, clearCart, session, setActiveBillId } = useApp()

  async function handleOrder() {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }
    setIsSubmitting(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      const orders = cart.map((item) => ({
        menuId: parseInt(item.menuItemId, 10),
        basePrice: item.basePrice,
        optionIds: item.selectedOptions.map((o) => o.choiceId),
        count: item.quantity,
      }))
      const response = await fetch(`${base}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: session.table._id,
          billsId: null,
          orders,
        }),
      })
      if (response.status === 409) {
        toast.error("This table is already waiting for payment")
        router.replace("/payment")
        return
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as { billsId: string }
      toast.success(`Order sent · Bill ${data.billsId}`)
      setActiveBillId(data.billsId)
      clearCart()
      router.push(`/bills`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send order")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh app-surface">
      <div className="mx-auto max-w-2xl px-4 pt-5 pb-36">
      <header className="mb-5 flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push("/menu")} aria-label="Back to menu">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
          <p className="text-sm text-muted-foreground mt-1">Review before sending to the kitchen.</p>
        </div>
      </header>

      {cart.length === 0 ? (
        <Card className="p-10 text-center flex flex-col items-center gap-3">
          <div className="size-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingCart className="size-5" />
          </div>
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button variant="outline" onClick={() => router.push("/menu")}>
            Browse menu
          </Button>
        </Card>
      ) : (
        <>
          <ul className="space-y-3">
            {cart.map((item) => (
              <li key={item.lineId}>
            <Card className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold leading-tight">
                        <span className="font-mono text-primary mr-1">{item.quantity}×</span>
                        {item.name}
                      </p>
                      <p className="font-semibold whitespace-nowrap">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    {item.selectedOptions.length > 0 && (
                      <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {item.selectedOptions.map((o) => (
                          <li key={`${item.lineId}-${o.groupId}-${o.choiceId}`}>
                            {o.groupName}: {o.choiceLabel}
                            {o.priceDelta > 0 && ` (+${formatPrice(o.priceDelta)})`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromCart(item.lineId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-xl font-semibold">{formatPrice(cartTotal)}</span>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 backdrop-blur-xl pb-safe">
            <div className="mx-auto max-w-2xl px-4 py-3">
              <Button size="lg" className="w-full" onClick={handleOrder} disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : `Send order · ${formatPrice(cartTotal)}`}
              </Button>
            </div>
          </div>
        </>
      )}
      </div>
    </main>
  )
}
