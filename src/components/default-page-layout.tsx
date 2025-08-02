import type { Store } from '@/api/stores'
import { CartButton } from '@/components/cart-button'
import { Footer } from '@/components/footer'
import { useTenantStore } from '@/store/use-tenant-store'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  showHeader?: boolean
}

export function DefaultPageLayout({ children, showHeader = true }: Props) {
  const { store } = useTenantStore()
  const pageTitle = store !== undefined ? store.name : 'cetus'

  return (
    <div className="min-h-screen">
      <title>{`${pageTitle}`}</title>
      {showHeader && <NavBar store={store} />}

      <main className="min-h-screen px-6 py-6 md:px-16 lg:px-32">
        {children}
      </main>

      <Footer />
    </div>
  )
}

type NavBarProps = {
  store?: Store | undefined
}

function NavBar({ store }: NavBarProps) {
  const navbarTitle = store !== undefined ? store.name : 'cetus'

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex items-center justify-between px-6 py-3 md:px-16 lg:px-32">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <h1 className="font-bold font-heading text-foreground text-xl">
              {navbarTitle}
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <CartButton />
        </div>
      </div>
    </header>
  )
}
