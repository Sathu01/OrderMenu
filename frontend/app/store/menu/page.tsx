"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Archive, Loader2, Pencil, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORIES } from "@/lib/menu-data"
import { formatPrice } from "@/lib/format"

type StoreMenuItem = {
  id: number
  name: string
  description: string
  basePrice: number
  url: string
  category: string
  available: boolean
  options?: number[]
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
const DEFAULT_FORM = {
  name: "",
  description: "",
  basePrice: "",
  url: "",
  category: CATEGORIES[0],
  options: "",
  available: true,
}

type MenuFormState = typeof DEFAULT_FORM

export default function StoreMenuPage() {
  const [items, setItems] = useState<StoreMenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<number>>(new Set())
  const [archiving, setArchiving] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StoreMenuItem | null>(null)
  const [form, setForm] = useState<MenuFormState>(DEFAULT_FORM)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/menu/store`)
      .then((r) => r.json())
      .then((data: unknown) => setItems(Array.isArray(data) ? (data as StoreMenuItem[]) : []))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false))
  }, [])

  function openCreateDialog() {
    setEditingItem(null)
    setForm(DEFAULT_FORM)
    setEditorOpen(true)
  }

  function openEditDialog(item: StoreMenuItem) {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description,
      basePrice: String(item.basePrice),
      url: item.url,
      category: item.category as MenuFormState["category"],
      options: (item.options ?? []).join(", "),
      available: item.available,
    })
    setEditorOpen(true)
  }

  function parseOptionGroups(value: string): number[] | null {
    const trimmed = value.trim()
    if (!trimmed) return []

    const values = trimmed.split(",").map((part) => Number(part.trim()))
    if (values.some((n) => !Number.isInteger(n) || n < 1)) {
      return null
    }
    return Array.from(new Set(values))
  }

  async function handleSaveMenu() {
    const optionGroups = parseOptionGroups(form.options)
    const basePrice = Number(form.basePrice)

    if (!form.name.trim()) {
      toast.error("Menu name is required.")
      return
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      toast.error("Base price must be zero or higher.")
      return
    }
    if (optionGroups === null) {
      toast.error("Option group IDs must be numbers separated by commas.")
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(editingItem ? `${BASE}/menu/${editingItem.id}` : `${BASE}/menu`, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          basePrice,
          url: form.url.trim(),
          category: form.category,
          options: optionGroups,
          available: form.available,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to save menu item.")
      }

      const saved = (await res.json()) as StoreMenuItem
      setItems((prev) => {
        if (editingItem) {
          return prev.map((item) => (item.id === saved.id ? saved : item))
        }
        return [saved, ...prev]
      })
      setEditorOpen(false)
      toast.success(editingItem ? "Menu item updated." : "Menu item created.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save menu item.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleArchiveMenu(item: StoreMenuItem) {
    const ok = window.confirm(`Archive ${item.name}? It will disappear from the live menu.`)
    if (!ok) return

    setArchiving((s) => new Set(s).add(item.id))
    try {
      const res = await fetch(`${BASE}/menu/${item.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to archive menu item.")
      }
      setItems((prev) => prev.filter((m) => m.id !== item.id))
      toast.success("Menu item archived.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive menu item.")
    } finally {
      setArchiving((s) => {
        const next = new Set(s)
        next.delete(item.id)
        return next
      })
    }
  }

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
    <main className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, archive, and toggle items on the live customer menu.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items, categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-9 bg-card"
              aria-label="Search menu"
            />
          </div>
          <Button type="button" className="h-11" onClick={openCreateDialog}>
            <Plus className="size-4" aria-hidden />
            Add item
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={`overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md ${item.available ? "" : "opacity-60"}`}
            >
              <div className="relative aspect-[16/10] bg-muted">
                <Image
                  src={item.url || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw"
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
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                  >
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={archiving.has(item.id)}
                    onClick={() => handleArchiveMenu(item)}
                  >
                    {archiving.has(item.id) ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Archive className="size-4" aria-hidden />
                    )}
                    Archive
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-10">No items match your search.</p>
      )}

      <Dialog open={editorOpen} onOpenChange={(open) => !isSaving && setEditorOpen(open)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit menu item" : "Add menu item"}</DialogTitle>
            <DialogDescription>
              These details are used on the customer menu and cashier bill screens.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="menu-name">Name</Label>
              <Input
                id="menu-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Craft IPA Beer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="menu-description">Description</Label>
              <Textarea
                id="menu-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short description shown to customers"
                className="min-h-20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="menu-price">Base price</Label>
                <Input
                  id="menu-price"
                  type="number"
                  min="0"
                  step="1"
                  value={form.basePrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))}
                  placeholder="180"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="menu-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, category: value as MenuFormState["category"] }))
                  }
                >
                  <SelectTrigger id="menu-category" className="h-10 w-full bg-background">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="menu-url">Image URL</Label>
              <Input
                id="menu-url"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/menu-item.jpg"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="menu-options">Option group IDs</Label>
              <Input
                id="menu-options"
                value={form.options}
                onChange={(e) => setForm((prev) => ({ ...prev, options: e.target.value }))}
                placeholder="1, 2"
              />
              <p className="text-xs text-muted-foreground">
                Use comma-separated option group IDs from MongoDB.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
              <Label htmlFor="menu-available" className="text-sm">
                Available on customer menu
              </Label>
              <Switch
                id="menu-available"
                checked={form.available}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, available: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isSaving} onClick={handleSaveMenu}>
              {isSaving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {editingItem ? "Save changes" : "Create item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
