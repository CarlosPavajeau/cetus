import { CartButton } from '@/components/cart-button'
import { Footer } from '@/components/footer'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SignedIn } from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import { LayoutDashboardIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  showHeader?: boolean
}

export function DefaultPageLayout({ children, showHeader = true }: Props) {
  return (
    <div className="min-h-screen">
      {showHeader && <NavBar />}

      <main className="container mx-auto min-h-screen bg-background px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  )
}

function NavBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex flex-shrink-0 items-center">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="font-bold font-heading text-foreground text-xl sm:text-2xl">
                TELEDIGITAL JYA
              </h1>
            </Link>
          </div>

          <div className="flex h-6 items-center space-x-6">
            <ThemeSwitch />

            <Separator orientation="vertical" className="h-6" />
            <SignedIn>
              <Button
                variant="outline"
                size="icon"
                className="relative"
                aria-label="start"
                asChild
              >
                <Link to="/app">
                  <LayoutDashboardIcon />
                </Link>
              </Button>
            </SignedIn>

            <CartButton />
          </div>
        </div>
      </div>
    </header>
  )
}
