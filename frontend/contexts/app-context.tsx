"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Bill, CartItem, MenuItem } from "@/lib/types"
import { INITIAL_MENU } from "@/lib/menu-data"

type SessionState = {
  table: { _id: string; name: string }
  activeBillId: string | null
}

type AppContextValue = {
  isHydrated: boolean

  // menu
  menu: MenuItem[]
  toggleAvailability: (id: string) => void

  // cart
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (lineId: string) => void
  clearCart: () => void
  cartTotal: number

  // bills
  bills: Bill[]
  getBill: (id: string) => Bill | undefined
  createBill: () => Bill
  addBill: (bill: Bill) => void
  setActiveBillId: (id: string | null) => void
  requestCheckout: (id: string) => void
  confirmPayment: (id: string) => void

  // session
  session: SessionState
  resetSession: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const LS_KEY = "restaurant-app-state-v1"
const DEFAULT_TABLE = { _id: "T1", name: "Bar Seat 1" }

type Persisted = {
  menu: MenuItem[]
  bills: Bill[]
  cart: CartItem[]
  session: SessionState
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return { menu: INITIAL_MENU, bills: [], cart: [], session: { table: DEFAULT_TABLE, activeBillId: null } }
  }
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) throw new Error("no state")
    const parsed = JSON.parse(raw) as Persisted
    // Validate and ensure session.table is always valid
    const session = parsed.session ?? { table: DEFAULT_TABLE, activeBillId: null }
    if (!session.table || !session.table._id || !session.table.name) {
      session.table = DEFAULT_TABLE
    }
    return {
      menu: parsed.menu?.length ? parsed.menu : INITIAL_MENU,
      bills: parsed.bills ?? [],
      cart: parsed.cart ?? [],
      session,
    }
  } catch {
    return { menu: INITIAL_MENU, bills: [], cart: [], session: { table: DEFAULT_TABLE, activeBillId: null } }
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU)
  const [bills, setBills] = useState<Bill[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [session, setSession] = useState<SessionState>({ table: DEFAULT_TABLE, activeBillId: null })

  // hydrate from localStorage once on mount
  useEffect(() => {
    const data = loadPersisted()
    setMenu(data.menu)
    setBills(data.bills)
    setCart(data.cart)
    setSession(data.session)
    setHydrated(true)
  }, [])

  // fetch latest menu from backend API after hydration
  useEffect(() => {
    if (!hydrated) return
    const base = (typeof window !== "undefined" && (window as any).NEXT_PUBLIC_API_URL) || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
    fetch(`${base}/menu`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const mapped = data.map((m) => ({
          id: String(m.id),
          name: m.name,
          description: m.description ?? "",
          price: m.basePrice ?? m.price ?? 0,
          category: m.category ?? "Beverage",
          image: m.url ?? m.image ?? "/placeholder.svg",
          available: m.available ?? true,
          optionGroups: [],
        }))
        setMenu(mapped)
      })
      .catch(() => {
        // ignore fetch errors and keep persisted/default menu
      })
  }, [hydrated])

  // persist
  useEffect(() => {
    if (!hydrated) return
    const data: Persisted = { menu, bills, cart, session }
    window.localStorage.setItem(LS_KEY, JSON.stringify(data))
  }, [menu, bills, cart, session, hydrated])

  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [cart],
  )

  const setActiveBillId = useCallback((id: string | null) => {
    setSession((s) => (s.activeBillId === id ? s : { ...s, activeBillId: id }))
  }, [])

  const value: AppContextValue = {
    isHydrated: hydrated,

    menu,
    toggleAvailability: (id) =>
      setMenu((m) => m.map((it) => (it.id === id ? { ...it, available: !it.available } : it))),

    cart,
    addToCart: (item) => setCart((c) => [...c, item]),
    removeFromCart: (lineId) => setCart((c) => c.filter((i) => i.lineId !== lineId)),
    clearCart: () => setCart([]),
    cartTotal,

    bills,
    getBill: (id) => bills.find((b) => b.id === id),
    createBill: () => {
      const newBill: Bill = {
        id: `B${Date.now().toString().slice(-6)}`,
        tableNumber: session.table.name,
        items: cart,
        total: cartTotal,
        status: "open",
        createdAt: Date.now(),
      }
      setBills((b) => [newBill, ...b])
      setSession((s) => ({ ...s, activeBillId: newBill.id }))
      setCart([])
      return newBill
    },
    addBill: (bill) => {
      setBills((b) => [bill, ...b])
      setSession((s) => ({ ...s, activeBillId: bill.id }))
      setCart([])
    },
    setActiveBillId,
    requestCheckout: (id) =>
      setBills((b) => b.map((bill) => (bill.id === id ? { ...bill, status: "processing" } : bill))),
    confirmPayment: (id) =>
      setBills((b) =>
        b.map((bill) => (bill.id === id ? { ...bill, status: "paid", paidAt: Date.now() } : bill)),
      ),

    session,
    resetSession: () => {
      setCart([])
      setSession({ table: session.table?.name ? session.table : DEFAULT_TABLE, activeBillId: null })
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

