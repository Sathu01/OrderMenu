"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChefHat, ClipboardList, History, BookOpen, Home } from "lucide-react"
import { useApp } from "@/contexts/app-context"
import { cn } from "@/lib/utils"

const links = [
  { href: "/store/menu", label: "Menu management", icon: BookOpen },
  { href: "/store/bills", label: "Processing bills", icon: ClipboardList, badgeKey: "processing" as const },
  { href: "/store/history", label: "Bill history", icon: History },
]

export function StoreSidebar() {
  const pathname = usePathname()
  const { bills } = useApp()
  const processingCount = bills.filter((b) => b.status === "processing").length

  return (
    <aside
      aria-label="Cashier navigation"
      className="md:w-64 md:min-h-svh md:border-r md:border-border border-b border-border bg-card md:bg-card/50"
    >
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <ChefHat className="size-4" />
        </div>
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground leading-none">
            Tabletop
          </p>
          <p className="font-semibold leading-tight">Cashier</p>
        </div>
      </div>
      <nav className="px-3 pb-3 md:pb-5">
        <ul className="grid grid-cols-3 md:grid-cols-1 gap-1">
          {links.map(({ href, label, icon: Icon, badgeKey }) => {
            const active = pathname?.startsWith(href)
            const badge = badgeKey === "processing" ? processingCount : 0
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                  {badge > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="hidden md:block mt-6 px-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Home className="size-3.5" />
            Switch role
          </Link>
        </div>
      </nav>
    </aside>
  )
}
