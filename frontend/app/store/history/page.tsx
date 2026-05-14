"use client"

import { useMemo, useState } from "react"
import { useApp } from "@/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

export default function BillHistoryPage() {
  const { bills } = useApp()
  const [page, setPage] = useState(1)

  const paid = useMemo(
    () =>
      bills
        .filter((b) => b.status === "paid")
        .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0)),
    [bills],
  )

  const pageCount = Math.max(1, Math.ceil(paid.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const slice = paid.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <main className="px-5 md:px-8 py-6 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Bill history</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All paid bills. Reference only, 10 per page.
        </p>
      </header>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Paid at</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No paid bills yet.
                </TableCell>
              </TableRow>
            ) : (
              slice.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono">{b.id}</TableCell>
                  <TableCell>{b.tableNumber}</TableCell>
                  <TableCell>{b.items.reduce((n, i) => n + i.quantity, 0)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.paidAt ? formatDateTime(b.paidAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPrice(b.total)}
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
    </main>
  )
}
