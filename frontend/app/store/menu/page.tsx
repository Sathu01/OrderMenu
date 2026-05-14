"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/format"

type StoreMenuItem = {
  id: number
  name: string
  description: string
  basePrice: number
  url: string
  category: string
  available: boolean
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function StoreMenuPage() {
  const [items, setItems] = useState<StoreMenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetch(`${BASE}/menu/store`)
      .then((r) => r.json())
      .then((data: unknown) => setItems(Array.isArray(data) ? (data as StoreMenuItem[]) : []))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleToggle(item: StoreMenuItem) {
    if (toggling.has(item.id)) return
    setToggling((s) => new Set(s).add(item.id))

    // optimistic update
    setItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, available: !m.available } : m)),
    )

    try {
      const res = await fetch(`${BASE}/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available }),
      })
      if (!res.ok) throw new Error("api error")
      const updated: StoreMenuItem = await res.json()
      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    } catch {
      // revert on failure
      setItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, available: item.available } : m)),
      )
    } finally {
      setToggling((s) => {
        const next = new Set(s)
        next.delete(item.id)
        return next
      })
    }
  }

  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q),
    )
  }, [items, query])

  return (
    <main className="px-5 md:px-8 py-6 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Menu management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle items on or off the live customer menu.
        </p>
      </header>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items, categories…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search menu"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={`overflow-hidden flex flex-col transition-opacity ${item.available ? "" : "opacity-60"}`}
            >
              <div className="relative aspect-[16/10] bg-muted">
                <Image
                  src={item.url || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                {!item.available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Unavailable
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{item.name}</h3>
                    <span className="text-sm font-semibold">{formatPrice(item.basePrice)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-2">
                    {item.category}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
                  <Label htmlFor={`avail-${item.id}`} className="text-sm">
                    {item.available ? "Available" : "Unavailable"}
                  </Label>
                  <Switch
                    id={`avail-${item.id}`}
                    checked={item.available}
                    disabled={toggling.has(item.id)}
                    onCheckedChange={() => handleToggle(item)}
                    aria-label={`Toggle availability for ${item.name}`}
                  />
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-10">No items match your search.</p>
      )}
    </main>
  )
}
