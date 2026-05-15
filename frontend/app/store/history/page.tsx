"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPrice, formatDateTime } from "@/lib/format"

const PAGE_SIZE = 10
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

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
  status: "paid"
}

type BillWithOrders = {
  bill: ApiBill
  orders: ApiOrder[]
}

function calcTotal(orders: ApiOrder[]): number {
  return orders.reduce((sum, order) => {
    const optionSum = order.options.reduce((s, option) => s + option.price, 0)
    return sum + (order.basePrice + optionSum) * order.count
  }, 0)
}

function calcItemCount(orders: ApiOrder[]): number {
  return orders.reduce((n, order) => n + order.count, 0)
}

function buildReceiptText({ bill, orders }: BillWithOrders): string {
  const lines = [
    "Bar POS Receipt",
    `Bill: ${bill.id}`,
    `Table: ${bill.tableId}`,
    `Created: ${formatDateTime(new Date(bill.createDate).getTime())}`,
    `Status: ${bill.status}`,
    "",
    "Items",
    "-----",
  ]

  for (const order of orders) {
    const optionSum = order.options.reduce((sum, option) => sum + option.price, 0)
    const unitPrice = order.basePrice + optionSum
    lines.push(`${order.count} x ${order.menuName || `Item ${order.menuId}`} - ${formatPrice(unitPrice * order.count)}`)

    for (const option of order.options) {
      lines.push(`  + ${option.name}${option.price > 0 ? ` (${formatPrice(option.price)})` : ""}`)
    }
  }

  lines.push("", `Total: ${formatPrice(calcTotal(orders))}`)
  return lines.join("\n")
}

function downloadReceipt(billWithOrders: BillWithOrders) {
  const blob = new Blob([buildReceiptText(billWithOrders)], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `receipt-${billWithOrders.bill.id}.txt`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function BillHistoryPage() {
  const [bills, setBills] = useState<BillWithOrders[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/bills/paid`)
      if (!res.ok) return
      const data: unknown = await res.json()
      setBills(Array.isArray(data) ? (data as BillWithOrders[]) : [])
    } catch {
      // Keep last known state on network error.
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const paid = useMemo(() => {
    return [...bills].sort(
      (a, b) => new Date(b.bill.createDate).getTime() - new Date(a.bill.createDate).getTime(),
    )
  }, [bills])

  const pageCount = Math.max(1, Math.ceil(paid.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const slice = paid.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const selected = paid.find(({ bill }) => bill.id === selectedId) ?? null

  return (
    <main className="px-5 md:px-8 py-6 max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bill history</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All paid bills from the backend. Reference only, 10 per page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {paid.length} paid
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setIsLoading(true)
              fetchBills()
            }}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Loading paid bills...
                </TableCell>
              </TableRow>
            ) : slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No paid bills yet.
                </TableCell>
              </TableRow>
            ) : (
              slice.map(({ bill, orders }) => (
                <TableRow
                  key={bill.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(bill.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedId(bill.id)
                    }
                  }}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-mono">{bill.id}</TableCell>
                  <TableCell>{bill.tableId}</TableCell>
                  <TableCell>{calcItemCount(orders)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(new Date(bill.createDate).getTime())}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPrice(calcTotal(orders))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {paid.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {safePage} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] sm:max-w-lg flex flex-col">
          {selected && (() => {
            const { bill, orders } = selected
            const total = calcTotal(orders)
            const itemCount = calcItemCount(orders)

            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <DialogTitle>Bill {bill.id}</DialogTitle>
                      <DialogDescription>
                        Table {bill.tableId} · {formatDateTime(new Date(bill.createDate).getTime())}
                      </DialogDescription>
                    </div>
                    <Badge variant="secondary">{bill.status}</Badge>
                  </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-1">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-medium">{itemCount}</span>
                  </div>

                  <ul className="divide-y divide-border">
                    {orders.map((order) => {
                      const optionSum = order.options.reduce((sum, option) => sum + option.price, 0)
                      const unitPrice = order.basePrice + optionSum

                      return (
                        <li key={order.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              <span className="font-mono text-primary mr-1">{order.count}x</span>
                              {order.menuName || `Item ${order.menuId}`}
                            </p>
                            {order.options.length > 0 && (
                              <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                {order.options.map((option) => (
                                  <li key={option.id}>
                                    {option.name}
                                    {option.price > 0 && ` +${formatPrice(option.price)}`}
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

                <DialogFooter>
                  <Button className="w-full" onClick={() => downloadReceipt(selected)}>
                    <Download className="size-4" />
                    Download receipt
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </main>
  )
}
