import Link from "next/link"
import { ChefHat, ShoppingBag } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function HomePage() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center px-6 py-16 bg-background">
      <div className="max-w-2xl w-full">
        <header className="text-center mb-10">
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Tabletop POS
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-balance tracking-tight">
            Order from your table.{" "}
            <span className="text-primary">Run the floor</span> from the counter.
          </h1>
          <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">
            Pick which side of the restaurant you&apos;re on to continue.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/menu" aria-label="Enter customer view">
            <Card className="p-6 hover:border-primary transition-colors h-full flex flex-col gap-4">
              <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingBag className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Customer</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Browse the menu, build your cart, and check out from table 12.
                </p>
              </div>
            </Card>
          </Link>

          <Link href="/store/menu" aria-label="Enter cashier view">
            <Card className="p-6 hover:border-primary transition-colors h-full flex flex-col gap-4">
              <div className="size-12 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                <ChefHat className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Cashier</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Manage menu availability, confirm payments, and view bill history.
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  )
}
