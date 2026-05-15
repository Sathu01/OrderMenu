import type { ReactNode } from "react"
import { BillStatusGuard } from "@/components/customer/bill-status-guard"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <BillStatusGuard />
      {children}
    </div>
  )
}
