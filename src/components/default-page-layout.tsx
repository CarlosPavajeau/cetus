import type { Store } from '@/api/stores'
import { CartButton } from '@/components/cart-button'
import { Footer } from '@/components/footer'
import { useAppStore } from '@/store/app'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  showHeader?: boolean
}

export function DefaultPageLayout({ children, showHeader = true }: Props) {
  const { currentStore } = useAppStore()

  return (
    <div className="min-h-screen">
      <title>{`${currentStore?.name}`}</title>
      {showHeader && <NavBar store={currentStore} />}

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
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex items-center justify-between px-6 py-3 md:px-16 lg:px-32">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <h1 className="font-bold font-heading text-foreground text-xl">
              {store ? store.name : 'TELEDIGITAL JYA'}
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
