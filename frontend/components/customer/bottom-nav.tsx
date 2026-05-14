"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UtensilsCrossed, Receipt, ShoppingCart, ChevronRight } from "lucide-react"
import { useApp } from "@/contexts/app-context"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/format"

export function BottomNav() {
  const pathname = usePathname()
  const { cart, session, getBill, cartTotal } = useApp()

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0)
  const activeBill = session.activeBillId ? getBill(session.activeBillId) : undefined

  // FAB destination: if there are items in the cart → go to cart
  // if there is an active bill (and cart is empty) → go to bills
  const fabHref = cartCount > 0 ? "/cart" : activeBill ? "/bills" : "/cart"
  const fabLabel = cartCount > 0 ? "View Cart" : activeBill ? "View Bill" : "Cart"
  const fabBadge = cartCount > 0 ? cartCount : null

  const menuActive = pathname === "/menu" || pathname?.startsWith("/menu/")
  const billActive = pathname === "/bills" || pathname === "/payment"

  return (
    <>
      {/* Spacer so content isn't hidden behind nav */}
      <div className="h-20" aria-hidden />

      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 inset-x-0 z-40"
      >
        {/* Cart / Bill quick-action strip — only visible when relevant */}
        {(cartCount > 0 || activeBill) && (
          <div className="mx-auto max-w-2xl px-3 pb-1">
            <Link
              href={fabHref}
              className={cn(
                "flex items-center justify-between w-full",
                "rounded-2xl px-4 py-3",
                "bg-primary text-primary-foreground",
                "shadow-lg shadow-primary/30",
                "text-sm font-semibold",
                "transition-transform active:scale-[0.98]",
              )}
            >
              <div className="flex items-center gap-2.5">
                {cartCount > 0 ? (
                  <>
                    <span className="flex items-center justify-center size-6 rounded-full bg-primary-foreground/20 text-xs font-bold tabular-nums">
                      {cartCount}
                    </span>
                    <span>View Cart</span>
                  </>
                ) : (
                  <>
                    <Receipt className="size-4" aria-hidden />
                    <span>View Bill · {activeBill && formatPrice(activeBill.total)}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {cartCount > 0 && (
                  <span className="text-primary-foreground/80 font-normal tabular-nums">
                    {formatPrice(cartTotal)}
                  </span>
                )}
                <ChevronRight className="size-4 opacity-70" aria-hidden />
              </div>
            </Link>
          </div>
        )}

        {/* Main tab bar */}
        <div className="bg-card/95 backdrop-blur-md border-t border-border">
          <ul className="mx-auto max-w-2xl grid grid-cols-3 h-16">

            {/* Menu tab */}
            <li>
              <Link
                href="/menu"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-full px-3 text-xs font-medium transition-colors",
                  menuActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={menuActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex items-center justify-center size-9 rounded-xl transition-colors",
                    menuActive ? "bg-primary/10" : "bg-transparent",
                  )}
                >
                  <UtensilsCrossed className="size-5" aria-hidden />
                </span>
                <span>Menu</span>
              </Link>
            </li>

            {/* Center — Cart shortcut tab */}
            <li className="relative flex items-center justify-center">
              <Link
                href={fabHref}
                aria-label={fabLabel}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 -mt-7",
                  "size-16 rounded-2xl shadow-xl",
                  "bg-primary text-primary-foreground",
                  "transition-transform active:scale-95",
                  (pathname === "/cart" || billActive) && "ring-2 ring-primary/40 ring-offset-2 ring-offset-card",
                )}
              >
                <ShoppingCart className="size-6" aria-hidden />
                {fabBadge !== null && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center tabular-nums shadow">
                    {fabBadge}
                  </span>
                )}
                <span className="text-[10px] font-semibold leading-none">
                  {cartCount > 0 ? "Cart" : "Bill"}
                </span>
              </Link>
            </li>

            {/* Bill tab */}
            <li>
              <Link
                href="/bills"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-full px-3 text-xs font-medium transition-colors",
                  billActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={billActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "relative flex items-center justify-center size-9 rounded-xl transition-colors",
                    billActive ? "bg-primary/10" : "bg-transparent",
                  )}
                >
                  <Receipt className="size-5" aria-hidden />
                  {activeBill && activeBill.status !== "paid" && (
                    <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary" aria-hidden />
                  )}
                </span>
                <span>Bill</span>
              </Link>
            </li>

          </ul>
          {/* Safe area spacer for phones with home bar */}
          <div className="h-safe-bottom bg-card/95" />
        </div>
      </nav>
    </>
  )
}
