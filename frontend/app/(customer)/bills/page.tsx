"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { UtensilsCrossed, Plus, Receipt } from "lucide-react"
import { useApp } from "@/contexts/app-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatPrice } from "@/lib/format"
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
  }>
}

export default function BillsPage() {
  const router = useRouter()
  const { session, menu, requestCheckout } = useApp()
  const [billData, setBillData] = useState<Bill | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!session.activeBillId) {
      setIsLoading(false)
      return
    }
    // fetch bill details from API using table ID
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
    fetch(`${base}/bills/${session.table._id}`)
      .then((r) => r.json())
      .then((data: BillDetail) => {
        // map API response to frontend Bill type
        const items: CartItem[] = data.orders.map((order) => {
          // Look up basePrice from menu or use from API if provided
          const menuItem = menu.find((m) => m.id === String(order.menuId))
          const basePrice = (order as any).basePrice ?? menuItem?.price ?? 0
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

        const bill: Bill = {
          id: data.bill.id,
          tableNumber: data.bill.tableId,
          items,
          total,
          status: data.bill.status === "processing" ? "processing" : data.bill.status === "paid" ? "paid" : "open",
          createdAt: new Date(data.bill.createDate).getTime(),
        }
        setBillData(bill)
      })
      .catch(() => setBillData(null))
      .finally(() => setIsLoading(false))
  }, [session.activeBillId])

  useEffect(() => {
    if (billData?.status === "processing") {
      router.replace("/payment")
    }
  }, [billData?.status, router])

  const total = billData?.total ?? 0

  return (
    <div className="flex flex-col min-h-svh bg-background">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-2">
          <UtensilsCrossed className="size-5 text-primary" aria-hidden />
          <h1 className="flex-1 text-base font-semibold">Ordered Items</h1>
          <span className="text-xs font-mono bg-secondary px-2 py-1 rounded-md text-secondary-foreground">
            Table {session.table?.name ?? "Unknown"}
          </span>
        </div>
      </header>

      {/* Order list */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pt-4 pb-40">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="size-7 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-muted-foreground text-sm">Loading bill...</p>
          </div>
        ) : !billData ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="size-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm text-center">
              No orders yet. Go to the menu to start ordering.
            </p>
            <Button variant="outline" onClick={() => router.push("/menu")}>
              Browse Menu
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs font-mono text-muted-foreground mb-3">Bill {billData.id}</p>
            <ul className="space-y-2">
              {billData.items.map((item) => (
                <li key={item.lineId}>
                  <Card className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug">
                          <span className="text-primary font-mono mr-1.5">{item.quantity}×</span>
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
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap tabular-nums">
                        {formatPrice((item.basePrice + item.selectedOptions.reduce((s, o) => s + o.priceDelta, 0)) * item.quantity)}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      {/* Sticky bottom — summary + two action buttons */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border pb-safe">
        <div className="mx-auto max-w-2xl px-4">

          {/* Summary row */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="size-4" aria-hidden />
              <span>Details</span>
            </div>
            <p className="text-sm font-semibold">
              Total&nbsp;
              <span className="text-primary tabular-nums">{formatPrice(total)}</span>
            </p>
          </div>

          {/* Two action buttons */}
          <div className="flex gap-3 py-3">
            {/* Order Food → back to menu */}
            <button
              type="button"
              onClick={() => router.push("/menu")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-4 h-12 text-sm font-semibold text-foreground transition-colors active:bg-muted"
            >
              <Plus className="size-4" aria-hidden />
              Order Food
            </button>

            {/* Check Bill → checkout dialog */}
            {billData ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 h-12 text-sm font-semibold shadow-sm shadow-primary/30 transition-transform active:scale-[0.97]"
                  >
                    <Receipt className="size-4" aria-hidden />
                    Check Bill
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm checkout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A cashier will collect payment. You won&apos;t be able to add more items after this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
                          await fetch(`${base}/bills/user/${billData.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                          })
                          requestCheckout(billData.id)
                          router.push("/payment")
                        } catch (err) {
                          console.error("Failed to update bill status:", err)
                          router.push("/payment")
                        }
                      }}
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/40 text-primary-foreground px-4 h-12 text-sm font-semibold cursor-not-allowed"
              >
                <Receipt className="size-4" aria-hidden />
                Check Bill
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}


