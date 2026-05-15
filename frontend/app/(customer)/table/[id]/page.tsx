"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useApp } from "@/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type ApiTable = {
  id: string
  name: string
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function TableEntryPage() {
  const params = useParams()
  const router = useRouter()
  const { setTable } = useApp()
  const tableId = params?.id ? String(params.id) : ""
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tableId) return

    let cancelled = false

    async function loadTable() {
      try {
        const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableId)}`)
        if (!res.ok) {
          setError(res.status === 404 ? "Table not found." : "Could not load this table.")
          return
        }

        const table = (await res.json()) as ApiTable
        if (cancelled) return

        setTable({ _id: table.id, name: table.name })
        router.replace("/menu")
      } catch {
        if (!cancelled) setError("Could not connect to the table service.")
      }
    }

    loadTable()

    return () => {
      cancelled = true
    }
  }, [router, setTable, tableId])

  return (
    <main className="min-h-svh flex items-center justify-center px-4 app-surface">
      <Card className="w-full max-w-sm p-6 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-semibold">Invalid table</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-5" variant="outline" onClick={() => router.replace("/")}>
              Back home
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <h1 className="text-lg font-semibold">Loading table {tableId}</h1>
            <p className="text-sm text-muted-foreground">Preparing your menu...</p>
          </div>
        )}
      </Card>
    </main>
  )
}
