import type { ReactNode } from "react"
import { StoreSidebar } from "@/components/store/sidebar"

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col md:flex-row bg-background">
      <StoreSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
