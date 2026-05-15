"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, Receipt } from "lucide-react"
import { useApp } from "@/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatPrice, formatDateTime } from "@/lib/format"
import type { Bill, CartItem } from "@/lib/types"

type BillDetail = {
  bill: {
    id: string
    createDate: string
    tableId: string
    status: "pending" | "processing" | "paid"
  }
  orders: Array<{
    id: string
    menuId: number
    menuName: string
    options: Array<{ id: string; name: string; price: number; groupId: number }>
    billsId: string
    count: number
    basePrice?: number
  }>
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
const POLL_INTERVAL = 3000

function mapApiToBill(data: BillDetail, menu: ReturnType<typeof useApp>["menu"]): Bill {
  const items: CartItem[] = data.orders.map((order) => {
    const menuItem = menu.find((m) => m.id === String(order.menuId))
    const basePrice = order.basePrice ?? menuItem?.price ?? 0
    const optionSum = order.options.reduce((s, o) => s + o.price, 0)
    const unitPrice = basePrice + optionSum
    return {
      lineId: order.id,
      menuItemId: String(order.menuId),
      name: order.menuName || `Item ${order.menuId}`,
      basePrice,
      quantity: order.count,
      selectedOptions: order.options.map((opt) => ({
        groupId: String(opt.groupId),
        groupName: `Group ${opt.groupId}`,
        choiceId: opt.id,
        choiceLabel: opt.name,
        priceDelta: opt.price,
      })),
      unitPrice,
    }
  })

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  return {
    id: data.bill.id,
    tableNumber: data.bill.tableId,
    items,
    total,
    status:
      data.bill.status === "paid"
        ? "paid"
        : data.bill.status === "processing"
          ? "processing"
          : "open",
    createdAt: new Date(data.bill.createDate).getTime(),
  }
}

export default function PaymentPage() {
  const router = useRouter()
  const { session, menu, resetSession } = useApp()
  const [billData, setBillData] = useState<Bill | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBill = useCallback(async () => {
    if (!session.table?._id) return
    try {
      const res = await fetch(`${BASE}/bills/${session.table._id}`)
      if (!res.ok) return
      const data: BillDetail = await res.json()
      setBillData(mapApiToBill(data, menu))
    } catch {
      // keep last known state on network error
    } finally {
      setIsLoading(false)
    }
  }, [session.table?._id, menu])

  // initial fetch
  useEffect(() => {
    fetchBill()
  }, [fetchBill])

  // poll every 3 s to detect cashier confirming payment
  useEffect(() => {
    const id = setInterval(fetchBill, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchBill])

  // once paid, reset session and go back to menu
  useEffect(() => {
    if (billData?.status === "paid") {
      const t = setTimeout(() => {
        resetSession()
        router.replace("/menu")
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [billData?.status, resetSession, router])

  useEffect(() => {
    if (billData?.status === "open") {
      router.replace("/bills")
    }
  }, [billData?.status, router])

  function downloadReceipt() {
    if (!billData) return
    const lines = [
      `Tabletop Receipt`,
      `Bill ${billData.id}`,
      `Table ${billData.tableNumber}`,
      `${formatDateTime(billData.createdAt)}`,
      ``,
      ...billData.items.map(
        (i) => `${i.quantity}x ${i.name}  ${formatPrice(i.unitPrice * i.quantity)}`,
      ),
      ``,
      `Total: ${formatPrice(billData.total)}`,
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${billData.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <main className="min-h-svh app-surface mx-auto max-w-2xl px-4 py-20 flex flex-col items-center gap-4">
        <div className="size-16 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
          <Receipt className="size-7 text-muted-foreground animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">Loading bill…</p>
      </main>
    )
  }

  if (!billData) {
    return (
      <main className="min-h-svh app-surface mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-muted-foreground">No bill in progress.</p>
        <Button variant="link" onClick={() => router.push("/menu")}>
          Back to menu
        </Button>
      </main>
    )
  }

  const isPaid = billData.status === "paid"

  return (
    <main className="min-h-svh app-surface mx-auto max-w-2xl px-4 pt-10 pb-20">
      <Card className="p-6 flex flex-col items-center text-center gap-3">
        {isPaid ? (
          <>
            <div className="size-14 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden>
                <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold">Payment confirmed</h1>
            <p className="text-sm text-muted-foreground">Returning to a fresh menu…</p>
          </>
        ) : (
          <>
            <div className="size-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Loader2 className="size-7 animate-spin" aria-hidden />
            </div>
            <h1 className="text-xl font-semibold">Waiting for cashier...</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Please bring this screen to the counter or wait at your table. The cashier will confirm your
              payment shortly.
            </p>
          </>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between text-sm pb-3 border-b border-border">
          <span className="font-mono text-muted-foreground">Bill {billData.id}</span>
          <span className="font-mono text-muted-foreground">Table {billData.tableNumber}</span>
        </div>
        <ul className="divide-y divide-border">
          {billData.items.map((item) => (
            <li key={item.lineId} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  <span className="font-mono text-primary mr-1">{item.quantity}×</span>
                  {item.name}
                </p>
                {item.selectedOptions.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {item.selectedOptions.map((o) => (
                      <li
                        key={`${item.lineId}-${o.groupId}-${o.choiceId}`}
                        className="text-xs text-muted-foreground"
                      >
                        {o.choiceLabel}
                        {o.priceDelta > 0 && ` +${formatPrice(o.priceDelta)}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="font-medium whitespace-nowrap tabular-nums">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-muted-foreground">Total</span>
          <span className="text-xl font-semibold">{formatPrice(billData.total)}</span>
        </div>
      </Card>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="w-full" onClick={downloadReceipt}>
          <Download className="size-4" />
          Download receipt
        </Button>
      </div>
    </main>
  )
}
