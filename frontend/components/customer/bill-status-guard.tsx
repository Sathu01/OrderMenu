"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useApp } from "@/contexts/app-context"

type BillStatusResponse = {
  bill: {
    id: string
    status: "pending" | "processing" | "paid"
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export function BillStatusGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { isHydrated, session, setActiveBillId } = useApp()

  useEffect(() => {
    if (!isHydrated || !session.table?._id || pathname === "/payment" || pathname.startsWith("/table/")) {
      return
    }

    let cancelled = false

    async function checkTableBill() {
      try {
        const res = await fetch(`${BASE}/bills/${session.table._id}`)

        if (cancelled) return

        if (res.status === 404) {
          setActiveBillId(null)
          return
        }

        if (!res.ok) return

        const data = (await res.json()) as BillStatusResponse
        setActiveBillId(data.bill.id)

        if (data.bill.status === "processing") {
          router.replace("/payment")
        }
      } catch {
        // Keep the current page on network errors.
      }
    }

    checkTableBill()

    return () => {
      cancelled = true
    }
  }, [isHydrated, pathname, router, session.table?._id, setActiveBillId])

  return null
}
