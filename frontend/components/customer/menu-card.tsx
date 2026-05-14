"use client"

import Image from "next/image"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import type { MenuItem } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

export function MenuCard({ item }: { item: MenuItem }) {
  const router = useRouter()
  const disabled = !item.available

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && router.push(`/menu/${item.id}`)}
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden bg-card text-left w-full",
        "shadow-sm border border-border/50",
        "transition-transform active:scale-[0.97]",
        disabled ? "opacity-50 pointer-events-none" : "",
      )}
      aria-label={`${item.name}, ${formatPrice(item.price)}`}
    >
      {/* Food image — square crop */}
      <div className="relative w-full aspect-square bg-muted overflow-hidden">
        <Image
          src={item.image || "/placeholder.svg"}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Orange price badge — top-left */}
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg shadow-md tabular-nums leading-none">
          {formatPrice(item.price)}
        </span>

        {/* Green + button — bottom-right */}
        {!disabled && (
          <span
            aria-hidden
            className="absolute bottom-2 right-2 size-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shadow-md transition-transform group-hover:scale-110 group-active:scale-95"
          >
            <Plus className="size-5 stroke-[2.5]" />
          </span>
        )}

        {/* Unavailable overlay */}
        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Name below image */}
      <div className="px-2.5 py-2">
        <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
          {item.name}
        </p>
      </div>
    </button>
  )
}
