"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/contexts/app-context"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/format"
import type { CartItem, MenuItem } from "@/lib/types"

const NO_OPTION_VALUE = "__none__"

export default function MenuDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const router = useRouter()
  const { addToCart } = useApp()
  const [item, setItem] = useState<MenuItem | null>(null)

  // selected: groupId -> choiceId[]  (max one choice per option group)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [qty, setQty] = useState(1)

  // fetch menu detail from backend
  useEffect(() => {
    if (!id) return
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
    fetch(`${base}/menu/${id}`)
      .then((r) => r.json())
      .then((data: any) => {
        const m = data.menu ?? data
        const groups = (data.optionGroups ?? []).map((g: any) => ({
          id: String(g.id),
          name: g.detail ?? g.name ?? "",
          required: !!g.required,
          choices: (g.options ?? []).map((o: any) => ({
            id: String(o.id),
            label: o.name ?? o.label ?? "",
            priceDelta: o.price ?? o.priceDelta ?? 0,
          })),
        }))

        const mapped: MenuItem = {
          id: String(m.id),
          name: m.name,
          description: m.description ?? "",
          price: m.basePrice ?? m.price ?? 0,
          category: m.category ?? "Beverage",
          image: m.url ?? m.image ?? "/placeholder.svg",
          available: m.available ?? true,
          optionGroups: groups,
        }
        setItem(mapped)
      })
      .catch(() => setItem(null))
  }, [id])

  // initialize selected when item loads
  useEffect(() => {
    if (!item) return
    const init: Record<string, string[]> = {}
    for (const g of item.optionGroups) {
      init[g.id] = g.required && g.choices[0] ? [g.choices[0].id] : []
    }
    setSelected(init)
  }, [item])

  const unitPrice = useMemo(() => {
    if (!item) return 0
    let delta = 0
    for (const g of item.optionGroups) {
      for (const choiceId of selected[g.id] ?? []) {
        const c = g.choices.find((x) => x.id === choiceId)
        if (c) delta += c.priceDelta
      }
    }
    return item.price + delta
  }, [item, selected])

  if (!item) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 app-surface min-h-svh">
        <p className="font-semibold">Item not found.</p>
        <Button variant="link" onClick={() => router.push("/menu")}>
          Back to menu
        </Button>
      </main>
    )
  }

  function handleAdd() {
    if (!item) return
    const selectedOptions = item.optionGroups.flatMap((g) =>
      (selected[g.id] ?? []).map((choiceId) => {
        const c = g.choices.find((x) => x.id === choiceId)!
        return {
          groupId: g.id,
          groupName: g.name,
          choiceId: c.id,
          choiceLabel: c.label,
          priceDelta: c.priceDelta,
        }
      }),
    )
    const cartItem: CartItem = {
      lineId: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      quantity: qty,
      selectedOptions,
      unitPrice,
    }
    addToCart(cartItem)
    toast.success(`Added ${qty} × ${item.name}`)
    router.push("/menu")
  }

  return (
    <main className="mx-auto max-w-2xl pb-32 app-surface min-h-svh">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" priority />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/95 to-transparent" />
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="absolute top-4 left-4 size-10 rounded-lg bg-card/90 border border-border/60 backdrop-blur flex items-center justify-center hover:bg-card shadow-sm"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>

      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
            <p className="text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
          </div>
          <p className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-base font-bold tabular-nums text-primary">
            {formatPrice(item.price)}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {item.optionGroups.map((group) => (
            <section key={group.id}>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                {group.name}
                {group.required && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">Required</span>
                )}
              </h2>

              <RadioGroup
                value={selected[group.id]?.[0] ?? NO_OPTION_VALUE}
                onValueChange={(value) =>
                  setSelected((s) => ({
                    ...s,
                    [group.id]: value === NO_OPTION_VALUE ? [] : [value],
                  }))
                }
                className="space-y-2"
              >
                {!group.required && (
                  <Label
                    htmlFor={`${group.id}-none`}
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-card px-4 py-3 cursor-pointer shadow-sm hover:border-primary has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id={`${group.id}-none`} value={NO_OPTION_VALUE} />
                      <span className="text-sm font-medium">No option</span>
                    </div>
                  </Label>
                )}

                {group.choices.map((c) => (
                  <Label
                    key={c.id}
                    htmlFor={`${group.id}-${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-card px-4 py-3 cursor-pointer shadow-sm hover:border-primary has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id={`${group.id}-${c.id}`} value={c.id} />
                      <span className="text-sm font-medium">{c.label}</span>
                    </div>
                    {c.priceDelta > 0 && (
                      <span className="text-sm text-muted-foreground">+{formatPrice(c.priceDelta)}</span>
                    )}
                  </Label>
                ))}
              </RadioGroup>
            </section>
          ))}

          {/* Quantity moved into the bottom action bar for better mobile layout */}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background p-1">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-md"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" />
            </Button>

            <span className="min-w-8 text-center font-mono font-semibold">{qty}</span>

            <Button
              size="icon"
              variant="ghost"
              className="rounded-md"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <Button size="lg" className="flex-1" onClick={handleAdd}>
            Add to cart · {formatPrice(unitPrice * qty)}
          </Button>
        </div>
      </div>
    </main>
  )
}
