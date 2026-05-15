"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ShoppingCart, UtensilsCrossed } from "lucide-react"
import { useApp } from "@/contexts/app-context"
import { CATEGORIES } from "@/lib/menu-data"
import { MenuCard } from "@/components/customer/menu-card"

export default function MenuPage() {
  const router = useRouter()
  const { menu, session, cart, cartTotal } = useApp()
  const [activeCategory, setActiveCategory] = useState<string>("All")

  const filtered = useMemo(() => {
    if (activeCategory === "All") return menu
    return menu.filter((m) => m.category === activeCategory)
  }, [menu, activeCategory])

  const categories = ["All", ...CATEGORIES] as const
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0)
  const activeBill = session.activeBillId

  return (
    <div className="flex flex-col min-h-svh app-surface">

      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 h-16 flex items-center gap-3">
          {/* Back to bills — only show if there is an active bill */}
          {activeBill ? (
            <button
              type="button"
              onClick={() => router.push("/bills")}
              aria-label="Back to bills"
              className="shrink-0 size-10 flex items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <div className="shrink-0 size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UtensilsCrossed className="size-5" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold leading-none truncate">Menu</h1>
            <p className="text-xs text-muted-foreground mt-1">Table {session.table?.name ?? "Unknown"}</p>
          </div>
        </div>

        {/* Category chips */}
        <nav aria-label="Categories" className="overflow-x-auto scrollbar-none">
          <ul className="mx-auto flex w-max max-w-2xl gap-2 px-4 pb-3">
            {categories.map((c) => {
              const active = activeCategory === c
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(c)}
                    aria-pressed={active}
                    className={
                      active
                        ? "px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground whitespace-nowrap shadow-sm shadow-primary/20"
                        : "px-4 py-2 rounded-lg text-sm font-semibold bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary whitespace-nowrap"
                    }
                  >
                    {c}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      {/* Food grid */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pt-4 pb-32">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No items in this category.</p>
        ) : (
          <section className="grid grid-cols-2 gap-3.5" aria-label="Menu items">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </section>
        )}
      </main>

      {/* Bottom cart bar — always visible at bottom */}
      <div className="fixed bottom-0 inset-x-0 z-30 pb-safe">
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="w-full flex items-center gap-3 rounded-lg bg-card/95 border border-border shadow-lg shadow-foreground/10 px-4 py-3 backdrop-blur-xl transition-transform active:scale-[0.98]"
            aria-label={`View cart, ${cartCount} items`}
          >
            <span className="size-10 shrink-0 flex items-center justify-center rounded-lg bg-primary/10">
              <ShoppingCart className="size-5 text-primary" />
            </span>
            <div className="flex-1 text-left">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Selected items</p>
              <p className="text-sm font-semibold text-foreground leading-none">
                {cartCount === 0 ? "0 items" : `${cartCount} item${cartCount > 1 ? "s" : ""}`}
              </p>
            </div>
            {cartCount > 0 && (
              <span className="text-sm font-bold text-primary tabular-nums">
                {/* lazy import to avoid SSR issues — format inline */}
                {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(cartTotal)}
              </span>
            )}
          </button>
        </div>
      </div>

    </div>
  )
}
