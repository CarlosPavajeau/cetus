import type { Store } from '@cetus/api-client/types/stores'
import { CartButton } from '@cetus/web/components/cart-button'
import { Footer } from '@cetus/web/components/footer'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  showHeader?: boolean
}

export function DefaultPageLayout({
  children,
  showHeader = true,
}: Readonly<Props>) {
  const { store } = useTenantStore()

  return (
    <div className="min-h-screen">
      {showHeader && <NavBar store={store} />}

      <main className="min-h-screen px-6 py-6 md:px-16 lg:px-32">
        {children}
      </main>

      <Footer />
    </div>
  )
}

type NavBarProps = {
  store?: Store
}

function NavBar({ store }: Readonly<NavBarProps>) {
  const navbarTitle = store?.name ?? 'cetus'
  const hasStore = Boolean(store)
  const hasCustomDomain = Boolean(store?.customDomain)

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex items-center justify-between px-6 py-3 md:px-16 lg:px-32">
        <div>
          <Link
            className="flex items-center gap-2"
            params={{
              store: store?.slug,
            }}
            to={hasStore && !hasCustomDomain ? '/$store' : '/'}
          >
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
