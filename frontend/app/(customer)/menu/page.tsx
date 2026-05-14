"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ShoppingCart } from "lucide-react"
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
    <div className="flex flex-col min-h-svh bg-background">

      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-2xl px-3 h-14 flex items-center gap-2">
          {/* Back to bills — only show if there is an active bill */}
          {activeBill ? (
            <button
              type="button"
              onClick={() => router.push("/bills")}
              aria-label="Back to bills"
              className="shrink-0 size-9 flex items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <div className="size-9 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-none truncate">Menu</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Table {session.table?.name ?? "Unknown"}</p>
          </div>
        </div>

        {/* Category chips */}
        <nav aria-label="Categories" className="overflow-x-auto scrollbar-none">
          <ul className="flex gap-2 px-3 pb-3 w-max">
            {categories.map((c) => {
              const active = activeCategory === c
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(c)}
                    className={
                      active
                        ? "px-3.5 py-1.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground whitespace-nowrap"
                        : "px-3.5 py-1.5 rounded-full text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted whitespace-nowrap"
                    }
                    aria-pressed={active}
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
      <main className="flex-1 mx-auto w-full max-w-2xl px-3 pt-3 pb-28">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No items in this category.</p>
        ) : (
          <section className="grid grid-cols-2 gap-3" aria-label="Menu items">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </section>
        )}
      </main>

      {/* Bottom cart bar — always visible at bottom */}
      <div className="fixed bottom-0 inset-x-0 z-30 pb-safe">
        <div className="mx-auto max-w-2xl px-3 pb-3">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border shadow-lg px-4 py-3 transition-transform active:scale-[0.98]"
            aria-label={`View cart, ${cartCount} items`}
          >
            <span className="size-10 shrink-0 flex items-center justify-center rounded-xl bg-primary/10">
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

