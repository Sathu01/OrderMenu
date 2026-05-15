"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatPrice, formatDateTime } from "@/lib/format"

type ApiOption = {
  id: string
  name: string
  price: number
  groupId: number
}

type ApiOrder = {
  id: string
  menuId: number
  menuName: string
  basePrice: number
  options: ApiOption[]
  billsId: string
  count: number
}

type ApiBill = {
  id: string
  createDate: string
  tableId: string
  status: string
}

type BillWithOrders = {
  bill: ApiBill
  orders: ApiOrder[]
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
const POLL_INTERVAL = 10_000

function calcTotal(orders: ApiOrder[]): number {
  return orders.reduce((sum, o) => {
    const optionSum = o.options.reduce((s, opt) => s + opt.price, 0)
    return sum + (o.basePrice + optionSum) * o.count
  }, 0)
}

function calcItemCount(orders: ApiOrder[]): number {
  return orders.reduce((n, o) => n + o.count, 0)
}

export default function ProcessingBillsPage() {
  const [bills, setBills] = useState<BillWithOrders[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/bills/processing`)
      if (!res.ok) return
      const data: unknown = await res.json()
      setBills(Array.isArray(data) ? (data as BillWithOrders[]) : [])
    } catch {
      // keep last known state on network error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // initial fetch
  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  // poll every 10 s for new bills
  useEffect(() => {
    const id = setInterval(fetchBills, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchBills])

  async function handleConfirmPayment(billId: string) {
    setConfirming(billId)
    try {
      const res = await fetch(`${BASE}/bills/store/${billId}`, { method: "PATCH" })
      if (!res.ok) throw new Error("api error")
      setBills((prev) => prev.filter((b) => b.bill.id !== billId))
      setSelectedId(null)
      toast.success(`Bill ${billId} marked as paid`)
    } catch {
      toast.error("Failed to confirm payment. Please try again.")
    } finally {
      setConfirming(null)
    }
  }

  const selected = bills.find((b) => b.bill.id === selectedId) ?? null

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Processing bills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-refreshes every 10s. Tap a bill to confirm payment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-10 rounded-lg px-3 font-mono">
            {bills.length} active
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setIsLoading(true); fetchBills() }}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-5 bg-muted rounded w-16" />
              </div>
              <div className="h-7 bg-muted rounded w-28" />
              <div className="h-3 bg-muted rounded w-32" />
            </Card>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No bills waiting for payment.
        </Card>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bills.map(({ bill, orders }) => {
            const total = calcTotal(orders)
            const itemCount = calcItemCount(orders)
            return (
              <li key={bill.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(bill.id)}
                  className="w-full text-left"
                >
                  <Card className="p-4 hover:border-primary transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm text-muted-foreground">{bill.id}</p>
                      <Badge className="rounded-md">Table {bill.tableId}</Badge>
                    </div>
                    <p className="mt-3 text-2xl font-semibold">{formatPrice(total)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {itemCount} item{itemCount !== 1 ? "s" : ""} ·{" "}
                      {formatDateTime(new Date(bill.createDate).getTime())}
                    </p>
                  </Card>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          {selected && (() => {
            const { bill, orders } = selected
            const total = calcTotal(orders)
            return (
              <>
                <SheetHeader>
                  <SheetTitle>Bill {bill.id}</SheetTitle>
                  <SheetDescription>
                    Table {bill.tableId} · {formatDateTime(new Date(bill.createDate).getTime())}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1 mt-4">
                  <ul className="divide-y divide-border">
                    {orders.map((order) => {
                      const optionSum = order.options.reduce((s, o) => s + o.price, 0)
                      const unitPrice = order.basePrice + optionSum
                      return (
                        <li key={order.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              <span className="font-mono text-primary mr-1">{order.count}×</span>
                              {order.menuName || `Item ${order.menuId}`}
                            </p>
                            {order.options.length > 0 && (
                              <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                {order.options.map((opt) => (
                                  <li key={opt.id}>
                                    {opt.name}
                                    {opt.price > 0 && ` +${formatPrice(opt.price)}`}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <p className="font-medium whitespace-nowrap tabular-nums">
                            {formatPrice(unitPrice * order.count)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-xl font-semibold">{formatPrice(total)}</span>
                  </div>
                </div>

                <SheetFooter className="mt-4">
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={confirming === bill.id}
                    onClick={() => handleConfirmPayment(bill.id)}
                  >
                    {confirming === bill.id
                      ? "Confirming…"
                      : `Confirm payment · ${formatPrice(total)}`}
                  </Button>
                </SheetFooter>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </main>
  )
}
