import type { Store } from '@/api/stores'
import { CartButton } from '@/components/cart-button'
import { Footer } from '@/components/footer'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SignedIn } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { LayoutDashboardIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  store?: Store
  showHeader?: boolean
}

export function DefaultPageLayout({
  children,
  store,
  showHeader = true,
}: Props) {
  return (
    <div className="min-h-screen">
      {showHeader && <NavBar store={store} />}

      <main className="container mx-auto min-h-screen bg-background px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  )
}

type NavBarProps = {
  store?: Store
}

function NavBar({ store }: NavBarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex flex-shrink-0 items-center">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="font-bold font-heading text-foreground text-xl sm:text-2xl">
                {store ? store.name : 'TELEDIGITAL JYA'}
              </h1>
            </Link>
          </div>

          <div className="flex h-6 items-center space-x-6">
            <div className="flex items-center space-x-4">
              <ThemeSwitch />

              <CartButton />
            </div>

            <SignedIn>
              <Separator orientation="vertical" className="h-6" />

              <Button size="sm" className="relative" aria-label="start" asChild>
                <Link to="/app">
                  <LayoutDashboardIcon />
                  <span className="hidden sm:block">Ir al panel</span>
                </Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  )
}
